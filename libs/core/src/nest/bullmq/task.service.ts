import { Injectable, Logger } from '@nestjs/common';
import { Job, JobType } from 'bullmq';
import { QueueFactory } from './queue.factory';
import { AddTaskOptions, QueueName, TaskResult } from './bullmq.types';
// import { BizError } from '../../BizError';

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
  async addTask<T = unknown>(
    options: AddTaskOptions<T>,
  ): Promise<Job<T> | null> {
    const { queue, name, data, bizKey, delay, priority, jobOptions } = options;

    // 生成幂等 jobId: {taskName}#{bizKey}
    const jobId = `${name}#${bizKey}`;

    const queueInstance = this.queueFactory.getQueue(queue);

    // 检查任务状态，防重逻辑
    const existingJob = await queueInstance.getJob(jobId);
    if (existingJob) {
      const state = await existingJob.getState();

      // 1. 如果任务正在执行，直接返回 null，表示当前任务无法被更新或重新添加
      if (state === 'active') {
        this.logger.debug(
          `Task is active, skipping update: queue=${queue}, jobId=${jobId}`,
        );
        return null;
      }

      // 2. 如果任务还在等待或延迟中，更新数据并返回最新 Job
      if (['waiting', 'delayed'].includes(state)) {
        await existingJob.updateData(data);
        this.logger.debug(`Task data updated: queue=${queue}, jobId=${jobId}`);
        return (await queueInstance.getJob(jobId)) || null;
      }

      // 3. 如果是已结算（完成或失败），先移除旧任务以允许重新添加
      if (['completed', 'failed'].includes(state)) {
        await existingJob.remove();
        this.logger.debug(`Removed settled job for re-run: ${jobId}`);
      }
    }

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
  ): Promise<Job<T> | null> {
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
   * 获取任务 Job 实例
   *
   * @param queue 队列名称
   * @param jobId 任务 ID
   */
  async getJob<T = unknown>(
    queue: QueueName,
    jobId: string,
  ): Promise<Job<T> | null> {
    const queueInstance = this.queueFactory.getQueue(queue);
    const job = await queueInstance.getJob(jobId);
    return (job as Job<T>) || null;
  }

  /**
   * 更新任务数据
   *
   * @param queue 队列名称
   * @param jobId 任务 ID
   * @param data 新任务数据
   */
  async updateJobData<T = unknown>(
    queue: QueueName,
    jobId: string,
    data: T,
  ): Promise<void> {
    const job = await this.getJob<T>(queue, jobId);
    if (!job) {
      this.logger.warn(
        `Cannot update task data, job not found: queue=${queue}, jobId=${jobId}`,
      );
      return;
    }
    await job.updateData(data);
    this.logger.debug(`Task data updated: queue=${queue}, jobId=${jobId}`);
  }

  /**
   * 获取任务列表
   *
   * @param queue 队列名称
   * @param types 任务状态数组
   * @param start 起始索引
   * @param end 结束索引
   * @param asc 是否升序
   */
  async getJobs<T = unknown>(
    queue: QueueName,
    types: JobType[] = ['active', 'waiting', 'completed', 'failed', 'delayed'],
    start = 0,
    end = 19,
    asc = false,
  ): Promise<Job<T>[]> {
    const queueInstance = this.queueFactory.getQueue(queue);
    const jobs = await queueInstance.getJobs(types, start, end, asc);
    return jobs as Job<T>[];
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
