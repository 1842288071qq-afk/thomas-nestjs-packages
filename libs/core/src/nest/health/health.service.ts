import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, ModuleRef, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import os from 'os';
import type { AppConfig } from '@thomas/nestjs/common/config/config.interface';
import { RedisService } from '../redis/redis.service';
import { HEALTH_INDICATOR_METADATA } from './health.constants';
import type {
  HealthCheck,
  HealthCheckResult,
  HealthReport,
  HealthStatus,
  LivenessReport,
} from './health.types';

interface CheckTask {
  name: string;
  critical: boolean;
  run: () => Promise<HealthCheckResult> | HealthCheckResult;
}

@Injectable()
export class HealthService implements OnModuleInit {
  private readonly logger = new Logger(HealthService.name);

  /** 被 @HealthIndicator 标注且实现 HealthCheck 的业务检查项 */
  private indicators: HealthCheck[] = [];
  /** 容器内发现的全部 TypeORM 数据源（按实例去重） */
  private dataSources: DataSource[] = [];
  /** RedisService 解析结果缓存（undefined=未解析，null=不存在） */
  private redis: RedisService | null | undefined = undefined;

  private cache?: { report: HealthReport; expiresAt: number };
  private inflight?: Promise<HealthReport>;

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    private readonly config: ConfigService<AllConfig>,
  ) {}

  onModuleInit(): void {
    this.indicators = this.discoverIndicators();
    this.dataSources = this.discoverDataSources();
    this.logger.log(
      `health ready: ${this.dataSources.length} datasource(s), ${this.indicators.length} business indicator(s)`,
    );
  }

  /** liveness：极轻量，不碰任何依赖，仅反映进程/事件循环存活 */
  liveness(): LivenessReport {
    return {
      status: 'up',
      app: this.appConfig().name,
      pid: process.pid,
      uptimeSec: Math.round(process.uptime()),
    };
  }

  /** readiness：跑全部检查（带缓存与单项超时） */
  async readiness(): Promise<HealthReport> {
    const now = Date.now();
    if (this.cache && now < this.cache.expiresAt) {
      return this.cache.report;
    }
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = this.compute().finally(() => {
      this.inflight = undefined;
    });
    return this.inflight;
  }

  private async compute(): Promise<HealthReport> {
    const app = this.appConfig();
    const timeoutMs = app.health.checkTimeoutMs;
    const tasks = this.buildTasks();

    const settled = await Promise.all(
      tasks.map((task) => this.runOne(task, timeoutMs)),
    );

    const checks: Record<string, HealthCheckResult> = {};
    let hasCriticalDown = false;
    let hasNonCriticalIssue = false;
    for (const { name, critical, result } of settled) {
      checks[name] = result;
      if (result.status === 'down') {
        if (critical) {
          hasCriticalDown = true;
        } else {
          hasNonCriticalIssue = true;
        }
      } else if (result.status === 'degraded') {
        hasNonCriticalIssue = true;
      }
    }

    const status: HealthStatus = hasCriticalDown
      ? 'down'
      : hasNonCriticalIssue
        ? 'degraded'
        : 'up';

    const report: HealthReport = {
      status,
      app: app.name,
      pid: process.pid,
      host: os.hostname(),
      port: app.port,
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks,
    };

    this.cache = { report, expiresAt: Date.now() + app.health.cacheTtlMs };
    return report;
  }

  /** 汇总内置检查（数据源 / Redis）与业务 indicator 为统一任务列表 */
  private buildTasks(): CheckTask[] {
    const tasks: CheckTask[] = [];

    for (const ds of this.dataSources) {
      const name = `datasource:${ds.options.name ?? 'default'}`;
      tasks.push({
        name,
        critical: true,
        run: async () => {
          await ds.query('SELECT 1');
          return { status: 'up', detail: { initialized: ds.isInitialized } };
        },
      });
    }

    const redis = this.resolveRedis();
    if (redis) {
      tasks.push({
        name: 'redis',
        critical: true,
        run: async () => {
          const pong = await redis.getClient().ping();
          return { status: 'up', detail: { ping: pong } };
        },
      });
    }

    for (const indicator of this.indicators) {
      tasks.push({
        name: indicator.name,
        critical: indicator.critical ?? true,
        run: () => indicator.check(),
      });
    }

    return tasks;
  }

  /** 执行单个检查：包硬超时 + 捕获异常，永不挂起或抛出 */
  private async runOne(
    task: CheckTask,
    timeoutMs: number,
  ): Promise<{ name: string; critical: boolean; result: HealthCheckResult }> {
    const start = Date.now();
    try {
      const result = await this.withTimeout(
        Promise.resolve().then(() => task.run()),
        timeoutMs,
      );
      return {
        name: task.name,
        critical: task.critical,
        result: { durationMs: Date.now() - start, ...result },
      };
    } catch (err) {
      return {
        name: task.name,
        critical: task.critical,
        result: {
          status: 'down',
          durationMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`timeout after ${ms}ms`)),
        ms,
      );
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err instanceof Error ? err : new Error(String(err)));
        },
      );
    });
  }

  private discoverIndicators(): HealthCheck[] {
    const found: HealthCheck[] = [];
    for (const wrapper of this.discovery.getProviders()) {
      const instance: unknown = wrapper.instance;
      const metatype = wrapper.metatype;
      if (!instance || !metatype) {
        continue;
      }
      const tagged = this.reflector.get<boolean>(
        HEALTH_INDICATOR_METADATA,
        metatype,
      );
      if (!tagged) {
        continue;
      }
      const candidate = instance as Partial<HealthCheck>;
      if (
        typeof candidate.name === 'string' &&
        typeof candidate.check === 'function'
      ) {
        found.push(candidate as HealthCheck);
      } else {
        this.logger.warn(
          `@HealthIndicator on ${String(wrapper.name)} 未正确实现 HealthCheck（缺 name/check），已忽略`,
        );
      }
    }
    return found;
  }

  private discoverDataSources(): DataSource[] {
    const seen = new Set<DataSource>();
    for (const wrapper of this.discovery.getProviders()) {
      const instance: unknown = wrapper.instance;
      if (instance instanceof DataSource) {
        seen.add(instance);
      }
    }
    return [...seen];
  }

  private resolveRedis(): RedisService | null {
    if (this.redis !== undefined) {
      return this.redis;
    }
    let resolved: RedisService | null;
    try {
      resolved = this.moduleRef.get(RedisService, { strict: false });
    } catch {
      resolved = null;
    }
    this.redis = resolved;
    return resolved;
  }

  private appConfig(): AppConfig {
    return this.config.get<AppConfig>('app')!;
  }
}
