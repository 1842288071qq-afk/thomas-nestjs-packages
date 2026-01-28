import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Job } from 'bullmq';
import { WorkerFactory } from './worker.factory';
import { CronService } from './cron/cron.service';
import { CronRegistry } from './cron/cron.registry';
import {
  TASK_HANDLER_METADATA,
  CRON_HANDLER_METADATA,
} from './bullmq.constants';
import type { TaskHandlerMetadata } from './task-handler.decorator';
import type { CronHandlerMetadata } from './cron-handler.decorator';
import { QueueName } from './bullmq.types';

type TaskHandler = (job: Job) => Promise<unknown>;

/**
 * Worker 扫描服务
 *
 * 自动扫描所有使用 @TaskHandler 和 @CronHandler 装饰器的方法，并注册到对应的 Worker 或 Cron 服务
 */
@Injectable()
export class WorkerDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(WorkerDiscoveryService.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly workerFactory: WorkerFactory,
    private readonly cronService: CronService,
    private readonly cronRegistry: CronRegistry,
  ) {}

  onModuleInit(): void {
    // 1. 自动发现 @TaskHandler
    const taskHandlers = this.discoverTaskHandlers();
    for (const [queue, handlers] of taskHandlers) {
      this.createWorkerForQueue(queue, handlers);
    }
    if (taskHandlers.size === 0) {
      this.logger.debug('No @TaskHandler found');
    }

    // 2. 自动发现 @CronHandler
    this.discoverCronHandlers();
  }

  /**
   * 扫描所有使用 @CronHandler 装饰器的方法并注册
   */
  private discoverCronHandlers(): void {
    const providers = this.discoveryService.getProviders();

    providers.forEach((wrapper: InstanceWrapper) => {
      const instance = wrapper.instance as Record<string, unknown> | null;
      if (!instance || typeof instance !== 'object') {
        return;
      }

      const prototype = Object.getPrototypeOf(instance) as Record<
        string,
        unknown
      >;
      if (!prototype) {
        return;
      }

      const methodNames = this.metadataScanner.getAllMethodNames(prototype);

      methodNames.forEach((methodName) => {
        const method = prototype[methodName] as (...args: unknown[]) => unknown;
        if (typeof method !== 'function') {
          return;
        }

        const metadata = this.reflector.get<CronHandlerMetadata>(
          CRON_HANDLER_METADATA,
          method,
        );

        if (!metadata) {
          return;
        }

        const { name, cron, description } = metadata;

        const cronHandler = instance[methodName];
        if (typeof cronHandler !== 'function') {
          return;
        }

        // 仅注册到注册表，不触发立即加入 BullMQ
        // CronService 的 onApplicationBootstrap 会统一处理启动
        this.cronRegistry.register({
          name,
          cron,
          description,
          handler: (cronHandler as () => Promise<void>).bind(
            instance,
          ) as () => Promise<void>,
        });

        this.logger.log(
          `Discovered @CronHandler: ${wrapper.name}.${methodName} -> ${name} (${cron})`,
        );
      });
    });
  }

  /**
   * 扫描所有使用 @TaskHandler 装饰器的方法
   */
  private discoverTaskHandlers(): Map<QueueName, Map<string, TaskHandler>> {
    const handlers = new Map<QueueName, Map<string, TaskHandler>>();

    const providers = this.discoveryService.getProviders();

    providers.forEach((wrapper: InstanceWrapper) => {
      const instance = wrapper.instance as Record<string, unknown> | null;
      if (!instance || typeof instance !== 'object') {
        return;
      }

      const prototype = Object.getPrototypeOf(instance) as Record<
        string,
        unknown
      >;
      if (!prototype) {
        return;
      }

      const methodNames = this.metadataScanner.getAllMethodNames(prototype);

      methodNames.forEach((methodName) => {
        const method = prototype[methodName] as (...args: unknown[]) => unknown;
        if (typeof method !== 'function') {
          return;
        }

        const metadata = this.reflector.get<TaskHandlerMetadata>(
          TASK_HANDLER_METADATA,
          method,
        );

        if (!metadata) {
          return;
        }

        const { taskName, queue } = metadata;

        if (!handlers.has(queue)) {
          handlers.set(queue, new Map());
        }

        const queueHandlers = handlers.get(queue)!;
        const targetMethod = instance[methodName];
        if (typeof targetMethod !== 'function') {
          return;
        }
        const boundHandler = (targetMethod as TaskHandler).bind(
          instance,
        ) as TaskHandler;
        queueHandlers.set(taskName, boundHandler);

        this.logger.log(
          `Discovered @TaskHandler: ${wrapper.name}.${methodName} -> ${queue}:${taskName}`,
        );
      });
    });

    return handlers;
  }

  /**
   * 为队列创建 Worker
   */
  private createWorkerForQueue(
    queue: QueueName,
    taskHandlers: Map<string, TaskHandler>,
  ): void {
    const handlersObj: Record<string, TaskHandler> = {};

    for (const [taskName, handler] of taskHandlers) {
      handlersObj[taskName] = handler;
    }

    this.workerFactory.createRoutedWorker(queue, handlersObj);

    this.logger.log(
      `Worker created for queue "${queue}" with ${taskHandlers.size} handlers`,
    );
  }
}
