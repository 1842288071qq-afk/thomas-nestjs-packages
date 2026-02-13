import { SetMetadata } from '@nestjs/common';
import { TASK_HANDLER_METADATA } from './bullmq.constants';
import { QueueName } from './bullmq.types';
import { WorkerOptions } from 'bullmq';

/**
 * 任务处理器配置选项
 */
export interface TaskHandlerOptions {
  /** 任务名称 */
  taskName: string;
  /** 队列名称 */
  queue?: QueueName;
  /** 并发数 */
  concurrency?: number;
  /** 额外的 Worker 选项 */
  workerOptions?: Omit<WorkerOptions, 'connection' | 'prefix' | 'concurrency'>;
}

/**
 * 任务处理器元数据接口
 */
export interface TaskHandlerMetadata extends Required<
  Pick<TaskHandlerOptions, 'taskName' | 'queue'>
> {
  /** 并发数 */
  concurrency?: number;
  /** 额外的 Worker 选项 */
  workerOptions?: Omit<WorkerOptions, 'connection' | 'prefix' | 'concurrency'>;
}

/**
 * 任务处理装饰器
 *
 * 用于标记方法为特定任务的处理器，简化 Worker 注册
 *
 * @param taskName 任务名称 或 配置选项
 * @param queue 队列名称（当第一个参数为 taskName 时有效，默认为 ASYNC）
 *
 * @example
 * ```typescript
 * @Processor(QueueName.ASYNC)
 * export class ExamWorker {
 *   @TaskHandler('exam.forceSubmit')
 *   async handleForceSubmit(job: Job<ForceSubmitPayload>) {
 *     // 处理逻辑
 *   }
 *
 *   @TaskHandler({ taskName: 'exam.autoGrade', concurrency: 5 })
 *   async handleAutoGrade(job: Job<AutoGradePayload>) {
 *     // 处理逻辑
 *   }
 * }
 * ```
 */
export function TaskHandler(
  taskNameOrOptions: string | TaskHandlerOptions,
  queue: QueueName = QueueName.ASYNC,
): MethodDecorator {
  const metadata: TaskHandlerMetadata =
    typeof taskNameOrOptions === 'string'
      ? { taskName: taskNameOrOptions, queue }
      : {
          queue: QueueName.ASYNC,
          ...taskNameOrOptions,
        };

  return SetMetadata<string, TaskHandlerMetadata>(
    TASK_HANDLER_METADATA,
    metadata,
  );
}
