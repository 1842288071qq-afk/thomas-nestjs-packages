import { SetMetadata } from '@nestjs/common';
import { TASK_HANDLER_METADATA } from './bullmq.constants';
import { QueueName } from './bullmq.types';

/**
 * 任务处理器元数据接口
 */
export interface TaskHandlerMetadata {
  /** 任务名称 */
  taskName: string;
  /** 队列名称 */
  queue: QueueName;
}

/**
 * 任务处理装饰器
 *
 * 用于标记方法为特定任务的处理器，简化 Worker 注册
 *
 * @param taskName 任务名称
 * @param queue 队列名称（默认为 ASYNC）
 *
 * @example
 * ```typescript
 * @Processor(QueueName.ASYNC)
 * export class ExamWorker {
 *   @TaskHandler('exam.forceSubmit')
 *   async handleForceSubmit(job: Job<ForceSubmitPayload>) {
 *     // 处理逻辑
 *   }
 * }
 * ```
 */
export function TaskHandler(
  taskName: string,
  queue: QueueName = QueueName.ASYNC,
): MethodDecorator {
  return SetMetadata<string, TaskHandlerMetadata>(TASK_HANDLER_METADATA, {
    taskName,
    queue,
  });
}
