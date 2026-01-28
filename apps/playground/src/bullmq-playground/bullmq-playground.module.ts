import { Module } from '@nestjs/common';
import { BullMQModule } from '@app/core/nest/bullmq';
import { BullmqPlaygroundController } from './bullmq-playground.controller';
import { BullmqPlaygroundHandlers } from './bullmq-playground.handlers';
import { BullmqPlaygroundManualWorker } from './bullmq-playground.manual-worker';

/**
 * BullMQ Playground 模块
 *
 * 演示两种 Worker 注册方式：
 * 1. @TaskHandler 装饰器（BullmqPlaygroundHandlers）- 声明式，自动扫描注册
 * 2. WorkerFactory（可选）- 命令式，手动创建
 */
@Module({
  imports: [BullMQModule.forRootFromConfig()],
  controllers: [BullmqPlaygroundController],
  providers: [
    // 方式一：使用 @TaskHandler 装饰器的处理器
    // WorkerDiscoveryService 会自动扫描这些类的原型并注册到对应的 Worker
    BullmqPlaygroundHandlers,

    // 方式二：使用 WorkerFactory 手动创建 Worker
    BullmqPlaygroundManualWorker,
  ],
})
export class BullmqPlaygroundModule {}
