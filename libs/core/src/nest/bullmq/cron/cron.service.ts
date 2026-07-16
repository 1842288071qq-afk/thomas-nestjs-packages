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
    const knownNames = new Set(cronJobs.map((job) => job.name));

    // 清理本进程 registry 之外的残留 repeatable（已删除/改名的 cron），
    // 避免 worker 抢到无 handler 的 job 而刷 "Cron job handler not found" 警告
    await this.cleanupOrphanRepeatables(knownNames);
    await this.cleanupOrphanJobs(knownNames);

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
   * 清理 CRON 队列中不在当前 registry 的残留 repeatable 任务
   *
   * cron 任务从代码中移除/改名后，BullMQ 队列里的 repeatable 调度仍会残留在 Redis，
   * 继续触发但 worker 找不到 handler。启动时按 name 比对清理掉这些孤儿。
   * 各进程队列前缀（bullmq:{appName}:{devName}）隔离，互不影响。
   */
  private async cleanupOrphanRepeatables(
    knownNames: Set<string>,
  ): Promise<void> {
    const cronQueue = this.queueFactory.getQueue(QueueName.CRON);
    const repeatables = await cronQueue.getRepeatableJobs();
    for (const repeatable of repeatables) {
      if (knownNames.has(repeatable.name)) continue;
      await cronQueue.removeRepeatableByKey(repeatable.key);
      this.logger.log(`Removed orphan cron repeatable: ${repeatable.name}`);
    }
  }

  /**
   * 清理已经由旧 repeatable 生成、但尚未执行的孤儿任务
   *
   * removeRepeatableByKey 只移除调度元数据，不会移除已经进入 waiting/delayed
   * 等状态的任务实例。若不额外清理，这些实例仍会被当前 worker 消费并因 registry
   * 中没有对应 handler 而产生警告。
   */
  private async cleanupOrphanJobs(knownNames: Set<string>): Promise<void> {
    const cronQueue = this.queueFactory.getQueue(QueueName.CRON);
    const jobs = await cronQueue.getJobs([
      'waiting',
      'delayed',
      'paused',
      'prioritized',
    ]);

    for (const job of jobs) {
      if (knownNames.has(job.name)) continue;
      await job.remove();
      this.logger.log(`Removed orphan cron job: ${job.name} (${job.id})`);
    }
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

        // 高频任务可声明 silentDebug 以静默「执行中 / 已完成」类 debug 日志，失败/警告日志不受影响
        if (!cronJob.silentDebug) {
          this.logger.debug(`Executing cron job: ${cronName}`);
        }

        try {
          await cronJob.handler();
          if (!cronJob.silentDebug) {
            this.logger.debug(`Cron job completed: ${cronName}`);
          }
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
