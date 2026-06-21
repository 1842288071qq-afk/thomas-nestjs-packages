import { ConsoleLogger } from '@nestjs/common';
import type { LogLevel } from '@nestjs/common';
import type { LogFileSink } from './log-file-sink';

type AppLogRecordLevel =
  | 'log'
  | 'error'
  | 'warn'
  | 'debug'
  | 'verbose'
  | 'fatal';

/**
 * 结构化文件 Logger：继承官方 ConsoleLogger，
 * - 控制台输出完全交给 super（保持原样、保留颜色，开发/`docker logs` 体验不变）；
 * - 额外把每条日志以逐行 JSON 写入滚动文件 sink。
 * 任何落盘异常都被吞掉，绝不影响 Nest 日志本身。
 */
export class FileLogger extends ConsoleLogger {
  constructor(
    context: string,
    levels: LogLevel[],
    private readonly sink: LogFileSink,
    private readonly appName: string,
  ) {
    super(context, { logLevels: levels });
  }

  log(message: unknown, ...rest: unknown[]): void {
    super.log(message as string, ...(rest as string[]));
    this.persist('log', message, rest);
  }

  error(message: unknown, ...rest: unknown[]): void {
    super.error(message as string, ...(rest as string[]));
    this.persist('error', message, rest);
  }

  warn(message: unknown, ...rest: unknown[]): void {
    super.warn(message as string, ...(rest as string[]));
    this.persist('warn', message, rest);
  }

  debug(message: unknown, ...rest: unknown[]): void {
    super.debug(message as string, ...(rest as string[]));
    this.persist('debug', message, rest);
  }

  verbose(message: unknown, ...rest: unknown[]): void {
    super.verbose(message as string, ...(rest as string[]));
    this.persist('verbose', message, rest);
  }

  fatal(message: unknown, ...rest: unknown[]): void {
    super.fatal(message as string, ...(rest as string[]));
    this.persist('fatal', message, rest);
  }

  private persist(
    level: AppLogRecordLevel,
    message: unknown,
    rest: unknown[],
  ): void {
    try {
      // Nest 约定最后一个 string 参数是 context；error 还可能带 trace 字符串
      const params = [...rest];
      const context =
        typeof params[params.length - 1] === 'string'
          ? (params.pop() as string)
          : (this.context ?? this.appName);

      const record: Record<string, unknown> = {
        ts: new Date().toISOString(),
        level,
        app: this.appName,
        pid: process.pid,
        context,
        msg: '',
      };

      if (message instanceof Error) {
        record.msg = message.message;
        if (message.stack) {
          record.trace = message.stack;
        }
      } else {
        record.msg = this.serializeForFile(message);
        if (
          (level === 'error' || level === 'fatal') &&
          typeof params[0] === 'string'
        ) {
          // Logger.error(message, stack, context) 形态：剩余首个 string 视为 trace
          record.trace = params.shift();
        }
      }

      if (params.length > 0) {
        record.details = params;
      }

      this.sink.write(`${JSON.stringify(record)}\n`);
    } catch {
      // 结构化落盘失败绝不能影响日志主流程
    }
  }

  private serializeForFile(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
