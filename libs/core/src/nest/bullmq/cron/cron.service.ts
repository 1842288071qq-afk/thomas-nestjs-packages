import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { QueueFactory } from '../queue.factory';
import { CronRegistry } from './cron.registry';
import type { CronJobDefinition } from '../bullmq.types';
import { QueueName } from '../bullmq.types';

/**
 * Cron 服务
 *
 * 模块初始化时启动所有已注册的 Cron 任务，使用 BullMQ 的 repeat 功能实现定时调度
 */
@Injectable()
export class CronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CronService.name);
  private worker: Worker | null = null;

  constructor(
    private readonly queueFactory: QueueFactory,
    private readonly cronRegistry: CronRegistry,
  ) {}

  /**
   * 应用程序启动时启动 Cron Worker
   * 使用 onApplicationBootstrap 确保所有模块的 onModuleInit (包括 Discovery) 已完成
   */
  async onApplicationBootstrap(): Promise<void> {
    const cronJobs = this.cronRegistry.getAll();

    if (cronJobs.length === 0) {
      this.logger.log('No cron jobs registered');
      return;
    }

    // 注册所有 Cron 任务
    for (const cronJob of cronJobs) {
      await this.registerCronJob(cronJob);
    }

    // 启动 Cron Worker
    this.startWorker();

    this.logger.log(`CronService started with ${cronJobs.length} cron jobs`);
  }

  /**
   * 注册单个 Cron 任务
   */
  private async registerCronJob(definition: CronJobDefinition): Promise<void> {
    const cronQueue = this.queueFactory.getQueue(QueueName.CRON);

    // 使用 BullMQ 的 repeat 功能实现定时调度
    // jobId 使用 cron 任务名称保证幂等
    await cronQueue.add(
      definition.name,
      { cronName: definition.name },
      {
        repeat: {
          pattern: definition.cron,
        },
        jobId: `cron#${definition.name}`,
      },
    );

    this.logger.log(
      `Cron job registered: ${definition.name} (${definition.cron})`,
    );
  }

  /**
   * 启动 Cron Worker
   */
  private startWorker(): void {
    const redisConfig = this.queueFactory.getRedisConfig();

    this.worker = new Worker(
      QueueName.CRON,
      async (job: Job) => {
        const cronName = job.name;
        const cronJob = this.cronRegistry.get(cronName);

        if (!cronJob) {
          this.logger.warn(`Cron job handler not found: ${cronName}`);
          return;
        }

        this.logger.debug(`Executing cron job: ${cronName}`);

        try {
          await cronJob.handler();
          this.logger.debug(`Cron job completed: ${cronName}`);
        } catch (error) {
          this.logger.error(
            `Cron job failed: ${cronName}`,
            error instanceof Error ? error.stack : error,
          );
          throw error;
        }
      },
      {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
        },
        prefix: this.queueFactory.getPrefix(),
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Cron job failed: ${job?.name}, reason: ${error.message}`,
      );
    });

    this.logger.log('Cron worker started');
  }

  /**
   * 动态注册 Cron 任务
   *
   * @param definition Cron 任务定义
   */
  async registerCron(definition: CronJobDefinition): Promise<void> {
    this.cronRegistry.register(definition);
    await this.registerCronJob(definition);
    this.logger.log(`Cron job dynamically registered: ${definition.name}`);
  }

  /**
   * 移除 Cron 任务
   *
   * @param name Cron 任务名称
   */
  async removeCron(name: string): Promise<boolean> {
    const cronQueue = this.queueFactory.getQueue(QueueName.CRON);

    // 移除重复任务
    const repeatable = await cronQueue.getRepeatableJobs();
    const job = repeatable.find((r) => r.name === name);

    if (job) {
      await cronQueue.removeRepeatableByKey(job.key);
      this.logger.log(`Cron job removed: ${name}`);
      return true;
    }

    return false;
  }
}
