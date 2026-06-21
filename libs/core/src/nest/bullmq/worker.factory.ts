import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Worker, Processor, WorkerOptions, Job } from 'bullmq';
import { QueueFactory } from './queue.factory';
import { QueueName } from './bullmq.types';

/**
 * Worker 工厂配置
 */
export interface CreateWorkerOptions {
  /** 队列名称 */
  queue: QueueName;
  /** 并发数 */
  concurrency?: number;
  /** 额外的 Worker 选项 */
  workerOptions?: Omit<WorkerOptions, 'connection' | 'prefix' | 'concurrency'>;
}

/**
 * 任务处理器类型
 */
export type TaskProcessor<T = unknown> = (job: Job<T>) => Promise<unknown>;

/**
 * Worker 工厂服务
 *
 * 统一创建和管理 BullMQ Worker 实例，简化业务层 Worker 创建逻辑
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class ExamWorker implements OnModuleInit {
 *   constructor(private readonly workerFactory: WorkerFactory) {}
 *
 *   onModuleInit() {
 *     this.workerFactory.createWorker({
 *       queue: QueueName.ASYNC,
 *       concurrency: 5,
 *     }, async (job) => {
 *       // 处理任务
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class WorkerFactory implements OnModuleDestroy {
  private readonly logger = new Logger(WorkerFactory.name);
  private readonly workers: Worker[] = [];

  constructor(private readonly queueFactory: QueueFactory) {}

  /**
   * 创建 Worker 实例
   *
   * @param options Worker 配置
   * @param processor 任务处理函数
   * @returns Worker 实例
   */
  createWorker<T = unknown>(
    options: CreateWorkerOptions,
    processor: Processor<T>,
  ): Worker<T> {
    const { queue, concurrency = 1, workerOptions } = options;
    const redisConfig = this.queueFactory.getRedisConfig();

    const worker = new Worker<T>(queue, processor, {
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        // BullMQ blocking 连接要求：阻塞命令不限重试
        maxRetriesPerRequest: null,
      },
      prefix: this.queueFactory.getPrefix(),
      concurrency,
      ...workerOptions,
    });

    // 注册事件监听
    worker.on('completed', (job) => {
      this.logger.debug(`Job completed: ${job.id} (${job.name})`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(
        `Job failed: ${job?.id} (${job?.name}), error: ${err.message}`,
      );
    });

    worker.on('error', (err) => {
      this.logger.error(`Worker error: ${err.message}`);
    });

    this.workers.push(worker);
    this.logger.log(`Worker created for queue: ${queue}`);

    return worker;
  }

  /**
   * 创建支持多任务名称路由的 Worker
   *
   * @param queue 队列名称
   * @param handlers 任务处理器映射 { taskName: handler }
   * @param options 额外选项
   *
   * @example
   * ```typescript
   * workerFactory.createRoutedWorker(QueueName.ASYNC, {
   *   'exam.forceSubmit': async (job) => { ... },
   *   'exam.autoGrade': async (job) => { ... },
   * });
   * ```
   */
  createRoutedWorker<T = unknown>(
    queue: QueueName,
    handlers: Record<string, TaskProcessor<T>>,
    options?: Omit<CreateWorkerOptions, 'queue'>,
  ): Worker<T> {
    return this.createWorker<T>({ queue, ...options }, async (job) => {
      const handler = handlers[job.name];
      if (!handler) {
        this.logger.warn(`No handler found for task: ${job.name}`);
        return;
      }
      return handler(job);
    });
  }

  /**
   * 模块销毁时关闭所有 Worker
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing all workers...');
    for (const worker of this.workers) {
      await worker.close();
    }
    this.logger.log(`${this.workers.length} workers closed`);
  }
}
