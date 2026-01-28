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
}

/**
 * Cron 任务处理装饰器
 *
 * 用于标记方法为特定的 Cron 任务处理器，系统启动时会自动发现并注册
 *
 * @param name Cron 任务名称
 * @param cron Cron 表达式
 * @param description 任务描述
 *
 * @example
 * ```typescript
 * export class ExamCron {
 *   @CronHandler('scan-expired-exam', '0/1 * * * *')
 *   async handleExpiredExam() {
 *     // 处理逻辑
 *   }
 * }
 * ```
 */
export function CronHandler(
  name: string,
  cron: string,
  description?: string,
): MethodDecorator {
  return SetMetadata<string, CronHandlerMetadata>(CRON_HANDLER_METADATA, {
    name,
    cron,
    description,
  });
}
