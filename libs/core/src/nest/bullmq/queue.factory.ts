import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueOptions } from 'bullmq';
import type { BullMQModuleOptions } from './bullmq.types';
import { QueueName } from './bullmq.types';
import {
  BULLMQ_MODULE_OPTIONS,
  DEFAULT_JOB_OPTIONS,
  QUEUE_NAMES,
} from './bullmq.constants';
import type { AppConfig } from '@thomas/nestjs/common/config/config.interface';
import os from 'os';

/**
 * 队列工厂服务
 *
 * 统一创建和管理 BullMQ 队列实例，使用 APP_NAME 和 DEV_NAME 实现命名空间隔离
 */
@Injectable()
export class QueueFactory implements OnModuleDestroy {
  private readonly logger = new Logger(QueueFactory.name);
  private readonly queues = new Map<QueueName, Queue>();
  private readonly prefix: string;

  constructor(
    @Inject(BULLMQ_MODULE_OPTIONS)
    private readonly options: BullMQModuleOptions,
    private readonly configService: ConfigService,
  ) {
    const appConfig = this.configService.get<AppConfig>('app');
    const appName = appConfig?.name || 'nestjs-app';
    const devName = appConfig?.devName || os.hostname();

    // 构建队列前缀：bullmq:{appName}:{devName}
    this.prefix = `bullmq:${appName}:${devName}`;

    this.logger.log(`QueueFactory initialized with prefix: ${this.prefix}`);

    // 初始化所有队列
    this.initializeQueues();
  }

  /**
   * 初始化所有队列实例
   */
  private initializeQueues(): void {
    for (const queueName of QUEUE_NAMES) {
      const queue = this.createQueue(queueName);
      this.queues.set(queueName, queue);
      this.logger.log(`Queue "${queueName}" initialized`);
    }
  }

  /**
   * 创建队列实例
   */
  private createQueue(name: QueueName): Queue {
    const queueOptions: QueueOptions = {
      connection: {
        host: this.options.redis.host,
        port: this.options.redis.port,
        password: this.options.redis.password,
        db: this.options.redis.db,
      },
      prefix: this.prefix,
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        ...this.options.defaultJobOptions,
      },
    };

    return new Queue(name, queueOptions);
  }

  /**
   * 获取队列实例
   */
  getQueue(name: QueueName): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Queue "${name}" not found`);
    }
    return queue;
  }

  /**
   * 获取所有已初始化的队列实例
   */
  getAllQueues(): Map<QueueName, Queue> {
    return this.queues;
  }

  /**
   * 获取队列前缀
   */
  getPrefix(): string {
    return this.prefix;
  }

  /**
   * 获取 Redis 配置
   */
  getRedisConfig(): BullMQModuleOptions['redis'] {
    return this.options.redis;
  }

  /**
   * 模块销毁时关闭所有队列
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing all queues...');
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logger.log(`Queue "${name}" closed`);
    }
  }
}
