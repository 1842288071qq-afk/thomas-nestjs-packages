import {
  DynamicModule,
  Global,
  Module,
  Provider,
  InjectionToken,
  OptionalFactoryDependency,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import type { BullMQModuleOptions } from './bullmq.types';
import { BULLMQ_MODULE_OPTIONS } from './bullmq.constants';
import { QueueFactory } from './queue.factory';
import { TaskService } from './task.service';
import { CronRegistry } from './cron/cron.registry';
import { CronService } from './cron/cron.service';
import { WorkerFactory } from './worker.factory';
import { WorkerDiscoveryService } from './worker-discovery.service';
import { RedisClientConfig } from '../redis/redis.types';

/**
 * BullMQ 模块配置接口（支持同步和异步配置）
 */
export interface BullMQModuleAsyncOptions {
  useFactory: (
    ...args: unknown[]
  ) => Promise<BullMQModuleOptions> | BullMQModuleOptions;
  inject?: (InjectionToken | OptionalFactoryDependency)[];
}

/**
 * BullMQ 核心模块
 *
 * 提供任务调度、Cron 定时任务等能力的核心基础设施模块
 *
 * @example
 * ```typescript
 * // 在 AppModule 中注册
 * @Module({
 *   imports: [
 *     BullMQModule.forRootAsync({
 *       useFactory: (configService: ConfigService) => ({
 *         redis: {
 *           host: configService.get('redis.host'),
 *           port: configService.get('redis.port'),
 *         },
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class BullMQModule {
  /**
   * 同步配置模块
   */
  static forRoot(options: BullMQModuleOptions): DynamicModule {
    return {
      module: BullMQModule,
      imports: [DiscoveryModule],
      providers: [
        {
          provide: BULLMQ_MODULE_OPTIONS,
          useValue: options,
        },
        QueueFactory,
        WorkerFactory,
        WorkerDiscoveryService,
        TaskService,
        CronRegistry,
        CronService,
      ],
      exports: [
        TaskService,
        CronService,
        CronRegistry,
        QueueFactory,
        WorkerFactory,
      ],
    };
  }

  /**
   * 异步配置模块（推荐）
   */
  static forRootAsync(asyncOptions: BullMQModuleAsyncOptions): DynamicModule {
    const asyncProvider: Provider = {
      provide: BULLMQ_MODULE_OPTIONS,
      useFactory: asyncOptions.useFactory,
      inject: asyncOptions.inject || [],
    };

    return {
      module: BullMQModule,
      imports: [DiscoveryModule],
      providers: [
        asyncProvider,
        QueueFactory,
        WorkerFactory,
        WorkerDiscoveryService,
        TaskService,
        CronRegistry,
        CronService,
      ],
      exports: [
        TaskService,
        CronService,
        CronRegistry,
        QueueFactory,
        WorkerFactory,
      ],
    };
  }

  /**
   * 从 ConfigService 自动加载配置
   *
   * @example
   * ```typescript
   * // config/redis.config.ts
   * export default registerAs('redis', () => ({
   *   host: process.env.REDIS_HOST || 'localhost',
   *   port: parseInt(process.env.REDIS_PORT || '6379', 10),
   * }));
   *
   * // app.module.ts
   * BullMQModule.forRootFromConfig()
   * ```
   */
  static forRootFromConfig(): DynamicModule {
    return this.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const redisConfig =
          configService.get<RedisClientConfig>('redis.default');
        const bullMqConfig =
          configService.get<RedisClientConfig>('redis.bullmq');
        // 深度合并：redisConfig 作为基础，bullMqConfig 的字段覆盖上去
        const config = { ...redisConfig, ...bullMqConfig };
        return {
          redis: {
            host: config?.host || 'localhost',
            port: config?.port || 6379,
            password: config?.password,
            db: config?.db,
          },
        };
      },
      inject: [ConfigService],
    });
  }
}
