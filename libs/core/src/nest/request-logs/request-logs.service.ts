import {
  ExecutionContext,
  Inject,
  Injectable,
  Optional,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { CoreRequestLogEntity } from '@thomas/nestjs/entities/core/sys/core-request-log.entity';
import { Repository } from 'typeorm';
import { getRealIp } from '../../utils/ip.util';
import { KafkaEventPublisher } from '../mq/kafka-publisher.service';
import {
  REQUEST_LOG_BODY_CAPTURE_METADATA,
  REQUEST_LOGS_OPTIONS,
} from './constants';
import type {
  CreateRequestLogInput,
  RequestLogBodyCaptureOptions,
  RequestLogsResolvedOptions,
} from './request-logs.types';
import { ThreadLocal } from '../als/thread-local';
import type { Request } from 'express';

interface RequestLogStartContext {
  startedAtMs: number;
  request: Request;
  captureRequestBody: boolean;
  captureResponseBody: boolean;
}

@Injectable()
export class RequestLogsService {
  private readonly logger = new Logger(RequestLogsService.name);

  constructor(
    @Inject(REQUEST_LOGS_OPTIONS)
    private readonly options: Record<string, unknown>,
    private readonly reflector: Reflector,
    private readonly threadLocal: ThreadLocal,
    @InjectRepository(CoreRequestLogEntity)
    private readonly repository: Repository<CoreRequestLogEntity>,
    @Optional()
    private readonly kafkaPublisher?: KafkaEventPublisher,
  ) {}

  private get resolvedOptions(): RequestLogsResolvedOptions {
    return this.options as unknown as RequestLogsResolvedOptions;
  }

  isHttpEnabled(context: ExecutionContext) {
    return (
      context.getType() === 'http' &&
      (this.resolvedOptions.persistEnabled ||
        this.resolvedOptions.accessLogEnabled)
    );
  }

  start(
    context: ExecutionContext,
    request: Request,
  ): RequestLogStartContext | null {
    if (this.shouldSkip(request)) {
      return null;
    }

    const decoratorOptions = this.reflector.getAllAndOverride<
      RequestLogBodyCaptureOptions | undefined
    >(REQUEST_LOG_BODY_CAPTURE_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);
    const runtimeOptions = this.threadLocal.get('requestLogs') ?? {};

    return {
      startedAtMs: Date.now(),
      request,
      captureRequestBody: this.resolveCaptureFlag(
        'requestBody',
        decoratorOptions,
        runtimeOptions,
        this.resolvedOptions.captureRequestBodyByDefault,
      ),
      captureResponseBody: this.resolveCaptureFlag(
        'responseBody',
        decoratorOptions,
        runtimeOptions,
        this.resolvedOptions.captureResponseBodyByDefault,
      ),
    };
  }

  async finishSuccess(
    state: RequestLogStartContext,
    responseBody: unknown,
    httpStatus: number,
  ): Promise<void> {
    const log = this.buildLogByState(state, {
      httpStatus,
      responseBody,
      success: httpStatus < 400,
      businessCodeHint: responseBody,
    });
    this.printAccessLog(log);
    await this.persist(log);
  }

  async finishError(
    state: RequestLogStartContext,
    error: Error & {
      getResponse?: () => unknown;
      getStatus?: () => number;
      code?: unknown;
    },
    httpStatus: number,
  ): Promise<void> {
    const errorResponse = this.extractErrorResponseBody(error);
    const log = this.buildLogByState(state, {
      httpStatus,
      responseBody: errorResponse,
      success: false,
      errorMessage: this.extractErrorMessage(error),
      businessCodeHint: errorResponse,
      error,
    });
    this.printAccessLog(log);
    await this.persist(log);
  }

  async consumeKafkaLog(payload: unknown): Promise<void> {
    if (!this.resolvedOptions.persistEnabled) {
      return;
    }

    const normalized = this.normalizeForStorage(payload);
    if (!normalized || typeof normalized !== 'object') {
      return;
    }

    const log = normalized as Partial<CreateRequestLogInput>;
    if (!log.systemType || !log.method || !log.path || !log.fullPath) {
      return;
    }

    await this.persistToDatabase({
      ...log,
      requestAt: this.parseDateValue(log.requestAt) ?? new Date(),
      costMs: Number(log.costMs ?? 0),
      httpStatus: Number(log.httpStatus ?? 500),
      success: Boolean(log.success),
    } as CreateRequestLogInput);
  }

  async persist(input: CreateRequestLogInput): Promise<void> {
    if (!this.resolvedOptions.persistEnabled) {
      return;
    }

    const shouldUseKafka = this.resolvedOptions.persistenceMode === 'kafka';

    if (shouldUseKafka) {
      const published = await this.publishToKafka(input);
      if (published) {
        return;
      }
    }

    await this.persistToDatabase(input);
  }

  private async publishToKafka(input: CreateRequestLogInput): Promise<boolean> {
    if (!this.kafkaPublisher) {
      this.logger.warn(
        'request logs persistenceMode is kafka, but KafkaEventPublisher is unavailable, fallback to database',
      );
      return false;
    }

    try {
      await this.kafkaPublisher.publish({
        name: this.resolvedOptions.kafkaTopic,
        key: input.requestId || input.identityId || input.accountId || '',
        payload: input,
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `request log publish failed: ${
          error instanceof Error ? error.message : 'unknown'
        }, fallback to database`,
      );
      return false;
    }
  }

  private async persistToDatabase(input: CreateRequestLogInput): Promise<void> {
    try {
      await this.repository.save(this.repository.create(input));
    } catch (error) {
      this.logger.warn(
        `request log persist failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  private printAccessLog(input: CreateRequestLogInput): void {
    if (!this.resolvedOptions.accessLogEnabled) {
      return;
    }

    const message = this.formatAccessLog(input);
    if (input.success) {
      this.logger.log(message);
      return;
    }

    this.logger.warn(message);
  }

  private formatAccessLog(input: CreateRequestLogInput): string {
    const segments = [
      input.ip || '-',
      this.stringifyAccessLogValue(`${input.method} ${input.fullPath}`),
      input.httpStatus.toString(),
      `${input.costMs}ms`,
      `success=${input.success ? 1 : 0}`,
    ];

    if (input.bizCode !== undefined) {
      segments.push(`bizCode=${input.bizCode}`);
    }

    if (input.requestId) {
      segments.push(`requestId=${input.requestId}`);
    }

    if (input.accountId) {
      segments.push(`accountId=${input.accountId}`);
    }

    if (input.identityId) {
      segments.push(`identityId=${input.identityId}`);
    }

    if (input.userAgent) {
      segments.push(`ua=${this.stringifyAccessLogValue(input.userAgent)}`);
    }

    if (input.requestBody !== undefined) {
      segments.push(`body=${this.stringifyAccessLogValue(input.requestBody)}`);
    }

    if (input.errorMessage) {
      segments.push(
        `error=${this.stringifyAccessLogValue(input.errorMessage)}`,
      );
    }

    return segments.join(' ');
  }

  private stringifyAccessLogValue(value: unknown): string {
    const result = JSON.stringify(value);
    return result === undefined ? String(value) : result;
  }

  private shouldSkip(request: Request): boolean {
    if (this.resolvedOptions.skip?.(request)) {
      return true;
    }

    const fullPath = request.originalUrl || request.url || '';
    return this.resolvedOptions.ignorePaths.some((rule) => {
      if (typeof rule === 'string') {
        return fullPath.startsWith(rule);
      }
      return rule.test(fullPath);
    });
  }

  private resolveCaptureFlag(
    field: keyof RequestLogBodyCaptureOptions,
    decoratorOptions: RequestLogBodyCaptureOptions | undefined,
    runtimeOptions: RequestLogBodyCaptureOptions,
    defaultValue: boolean,
  ) {
    const runtimeValue = runtimeOptions[field];
    if (typeof runtimeValue === 'boolean') {
      return runtimeValue;
    }

    const decoratorValue = decoratorOptions?.[field];
    if (typeof decoratorValue === 'boolean') {
      return decoratorValue;
    }

    return defaultValue;
  }

  private buildLogByState(
    state: RequestLogStartContext,
    options: {
      httpStatus: number;
      success: boolean;
      responseBody?: unknown;
      errorMessage?: string;
      businessCodeHint?: unknown;
      error?: { code?: unknown };
    },
  ): CreateRequestLogInput {
    const { request, startedAtMs, captureRequestBody, captureResponseBody } =
      state;
    const store = this.threadLocal.getStore();
    const startedAt = new Date(startedAtMs);
    const fullPath = this.getFullPath(request);

    return {
      systemType: this.resolvedOptions.systemType,
      accountId: this.stringifyScalar(store?.account?.id),
      accountSource: this.stringifyScalar(store?.identity?.accountSource),
      identityId: this.stringifyScalar(store?.identity?.id),
      requestId: this.threadLocal.get('requestId'),
      method: request.method,
      requestAt: startedAt,
      fullPath,
      path: this.getPathWithoutQuery(fullPath),
      query: this.toRecord(this.normalizeForStorage(request.query)),
      params: this.toRecord(this.normalizeForStorage(request.params)),
      requestBody: captureRequestBody
        ? this.normalizeForStorage(request.body)
        : undefined,
      responseBody: captureResponseBody
        ? this.normalizeForStorage(options.responseBody)
        : undefined,
      headers: this.resolvedOptions.includeHeaders
        ? this.sanitizeHeaders(request.headers)
        : undefined,
      ip: getRealIp(request),
      userAgent: this.getUserAgent(request),
      costMs: Date.now() - startedAtMs,
      httpStatus: options.httpStatus,
      bizCode:
        this.extractBizCode(options.businessCodeHint) ??
        this.extractBizCode(options.error),
      success: options.success,
      errorMessage: options.errorMessage,
    };
  }

  private getFullPath(request: Request) {
    return request.originalUrl || request.url || request.path || '/';
  }

  private getPathWithoutQuery(fullPath: string) {
    const [path] = fullPath.split('?');
    return path || '/';
  }

  private getUserAgent(request: Request): string | undefined {
    const userAgent = request.headers['user-agent'];
    if (Array.isArray(userAgent)) {
      return typeof userAgent[0] === 'string' ? userAgent[0] : undefined;
    }

    return typeof userAgent === 'string' ? userAgent : undefined;
  }

  private sanitizeHeaders(
    headers: Request['headers'],
  ): Record<string, unknown> {
    const maskedHeaderSet = new Set(
      this.resolvedOptions.maskedHeaders.map((item) => item.toLowerCase()),
    );

    return Object.fromEntries(
      Object.entries(headers).map(([key, value]) => {
        const normalizedKey = key.toLowerCase();
        if (maskedHeaderSet.has(normalizedKey)) {
          return [key, '***'];
        }

        return [key, this.normalizeForStorage(value) ?? null];
      }),
    );
  }

  private extractErrorMessage(error: Error | undefined) {
    if (!error) {
      return 'Unknown error';
    }
    return error.message || 'Unknown error';
  }

  private extractErrorResponseBody(
    error: Error & { getResponse?: () => unknown },
  ) {
    if (typeof error?.getResponse === 'function') {
      return error.getResponse();
    }

    return {
      name: error?.name,
      message: error?.message,
    };
  }

  private extractBizCode(value: unknown): number | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const directCode = (value as Record<string, unknown>).code;
    if (typeof directCode === 'number' && Number.isFinite(directCode)) {
      return directCode;
    }

    const nestedResponse = (value as Record<string, unknown>).response;
    if (nestedResponse && typeof nestedResponse === 'object') {
      const nestedCode = (nestedResponse as Record<string, unknown>).code;
      if (typeof nestedCode === 'number' && Number.isFinite(nestedCode)) {
        return nestedCode;
      }
    }

    return undefined;
  }

  private normalizeForStorage(value: unknown): unknown {
    if (value === undefined) {
      return undefined;
    }

    const normalized = this.toJsonLike(value, 0);
    const raw = JSON.stringify(normalized);

    if (raw.length <= this.resolvedOptions.maxBodyLength) {
      return normalized;
    }

    return {
      __truncated__: true,
      preview: raw.slice(0, this.resolvedOptions.maxBodyLength),
      originalLength: raw.length,
    };
  }

  private toJsonLike(value: unknown, depth: number): unknown {
    if (depth >= 6) {
      return '[MaxDepth]';
    }

    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Buffer.isBuffer(value)) {
      return {
        type: 'Buffer',
        byteLength: value.length,
      };
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack || '',
      };
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.toJsonLike(item, depth + 1));
    }

    if (typeof value === 'function') {
      return '[Function]';
    }

    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(
          ([key, currentValue]) => {
            return [key, this.toJsonLike(currentValue, depth + 1)];
          },
        ),
      );
    }

    return '[Unsupported]';
  }

  private stringifyScalar(value: unknown): string | undefined {
    if (
      value === undefined ||
      value === null ||
      typeof value === 'object' ||
      typeof value === 'function'
    ) {
      return undefined;
    }

    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'bigint') return value.toString();

    return undefined;
  }

  private toRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  private parseDateValue(value: unknown): Date | undefined {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return undefined;
  }
}
