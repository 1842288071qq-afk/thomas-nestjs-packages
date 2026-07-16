import { SetMetadata } from '@nestjs/common';
import { CRON_HANDLER_METADATA } from './bullmq.constants';

/**
 * Cron 处理器元数据接口
 */
export interface CronHandlerMetadata {
  /** Cron 任务名称 */
  name: string;
  /** Cron 表达式 */
  cron: string;
  /** 任务描述 */
  description?: string;
  /** 静默 debug 日志：跳过「执行中 / 已完成」类 debug 日志，失败/警告日志不受影响 */
  silentDebug?: boolean;
}

/**
 * @CronHandler 装饰器附加选项
 */
export interface CronHandlerOptions {
  /** 静默 debug 日志：跳过「执行中 / 已完成」类 debug 日志，失败/警告日志不受影响 */
  silentDebug?: boolean;
}

/**
 * Cron 任务处理装饰器
 *
 * 用于标记方法为特定的 Cron 任务处理器，系统启动时会自动发现并注册
 *
 * @param name Cron 任务名称
 * @param cron Cron 表达式
 * @param description 任务描述
 * @param options 附加选项（如 silentDebug 静默高频任务的 debug 日志）
 *
 * @example
 * ```typescript
 * export class ExamCron {
 *   @CronHandler('scan-expired-exam', '0/1 * * * *')
 *   async handleExpiredExam() {
 *     // 处理逻辑
 *   }
 *
 *   // 高频任务可静默 debug 日志
 *   @CronHandler('collaboration-outbox-publish', '0/5 * * * * *', '发布通知', {
 *     silentDebug: true,
 *   })
 *   async publishBatch() {}
 * }
 * ```
 */
export function CronHandler(
  name: string,
  cron: string,
  description?: string,
  options?: CronHandlerOptions,
): MethodDecorator {
  return SetMetadata<string, CronHandlerMetadata>(CRON_HANDLER_METADATA, {
    name,
    cron,
    description,
    silentDebug: options?.silentDebug,
  });
}
