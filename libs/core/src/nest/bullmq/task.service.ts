import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QueueFactory } from './queue.factory';
import { AddTaskOptions, QueueName, TaskResult } from './bullmq.types';

/**
 * 任务服务
 *
 * 业务层添加 BullMQ 任务的唯一入口，提供统一的任务添加、查询接口
 */
@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(private readonly queueFactory: QueueFactory) {}

  /**
   * 添加异步任务
   *
   * @param options 任务选项
   * @returns 任务 Job 实例
   *
   * @example
   * ```typescript
   * await taskService.addTask({
   *   queue: QueueName.ASYNC,
   *   name: 'exam.forceSubmit',
   *   bizKey: examId,
   *   data: { examId },
   * });
   * ```
   */
  async addTask<T = unknown>(options: AddTaskOptions<T>): Promise<Job<T>> {
    const { queue, name, data, bizKey, delay, priority, jobOptions } = options;

    // 生成幂等 jobId: {taskName}#{bizKey}
    const jobId = `${name}#${bizKey}`;

    const queueInstance = this.queueFactory.getQueue(queue);

    const job = await queueInstance.add(name, data, {
      jobId,
      delay,
      priority,
      ...jobOptions,
    });

    this.logger.debug(
      `Task added: queue=${queue}, name=${name}, jobId=${jobId}`,
    );

    return job as Job<T>;
  }

  /**
   * 添加延迟任务
   *
   * @param options 任务选项（不含 delay）
   * @param delayMs 延迟时间（毫秒）
   */
  async addDelayedTask<T = unknown>(
    options: Omit<AddTaskOptions<T>, 'delay'>,
    delayMs: number,
  ): Promise<Job<T>> {
    return this.addTask({
      ...options,
      delay: delayMs,
    });
  }

  /**
   * 获取任务状态
   *
   * @param queue 队列名称
   * @param jobId 任务 ID
   */
  async getTaskStatus(
    queue: QueueName,
    jobId: string,
  ): Promise<TaskResult | null> {
    const queueInstance = this.queueFactory.getQueue(queue);
    const job = await queueInstance.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      success: state === 'completed',
      data: {
        id: job.id,
        name: job.name,
        state,
        progress: job.progress,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn,
      },
    };
  }

  /**
   * 移除任务
   *
   * @param queue 队列名称
   * @param jobId 任务 ID
   */
  async removeTask(queue: QueueName, jobId: string): Promise<boolean> {
    const queueInstance = this.queueFactory.getQueue(queue);
    const job = await queueInstance.getJob(jobId);

    if (!job) {
      return false;
    }

    await job.remove();
    this.logger.debug(`Task removed: queue=${queue}, jobId=${jobId}`);
    return true;
  }

  /**
   * 重试失败的任务
   *
   * @param queue 队列名称
   * @param jobId 任务 ID
   */
  async retryTask(queue: QueueName, jobId: string): Promise<boolean> {
    const queueInstance = this.queueFactory.getQueue(queue);
    const job = await queueInstance.getJob(jobId);

    if (!job) {
      return false;
    }

    const state = await job.getState();
    if (state !== 'failed') {
      this.logger.warn(
        `Cannot retry task in state "${state}": queue=${queue}, jobId=${jobId}`,
      );
      return false;
    }

    await job.retry();
    this.logger.debug(`Task retried: queue=${queue}, jobId=${jobId}`);
    return true;
  }

  /**
   * 获取所有可用的队列列表
   */
  getQueues(): string[] {
    return Array.from(this.queueFactory.getAllQueues().keys());
  }

  /**
   * 获取队列的详细指标（任务计数）
   * @param queue 队列名称
   */
  async getQueueMetrics(queue: QueueName) {
    const queueInstance = this.queueFactory.getQueue(queue);
    const counts = await queueInstance.getJobCounts(
      'active',
      'completed',
      'failed',
      'delayed',
      'waiting',
      'paused',
    );
    return counts;
  }
}
