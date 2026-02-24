import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  TaskHandler,
  QueueName,
  CronHandler,
} from '@thomas/nestjs/core/nest/bullmq';

/**
 * BullMQ Playground 任务处理器
 *
 * 演示如何使用 @TaskHandler 和 @CronHandler 装饰器定义任务处理方法
 * 模块启动时 WorkerDiscoveryService 会自动扫描并注册这些处理器
 */
@Injectable()
export class BullmqPlaygroundHandlers {
  private readonly logger = new Logger(BullmqPlaygroundHandlers.name);

  /**
   * 演示 @CronHandler 装饰器：每分钟执行一次
   */
  @CronHandler('playground-every-minute', '*/1 * * * *', '演示定时任务')
  async handleEveryMinuteCron() {
    this.logger.log('[CronHandler] Execution of every-minute cron task');
    // 业务逻辑...
    await Promise.resolve();
  }

  /**
   * 处理测试任务
   */
  @TaskHandler('test.task', QueueName.ASYNC)
  async handleTestTask(
    job: Job<{ message?: string }>,
  ): Promise<{ processed: boolean }> {
    this.logger.log(`[TaskHandler] Processing test task: ${job.id}`);
    this.logger.log(`[TaskHandler] Job data: ${JSON.stringify(job.data)}`);

    // 模拟任务处理
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.logger.log(`[TaskHandler] Test task completed: ${job.id}`);
    return { processed: true };
  }

  /**
   * 处理考试强制交卷任务
   */
  @TaskHandler('exam.forceSubmit', QueueName.ASYNC)
  async handleExamForceSubmit(
    job: Job<{ examId: string }>,
  ): Promise<{ submitted: boolean }> {
    const { examId } = job.data;
    this.logger.log(`[TaskHandler] Force submitting exam: ${examId}`);

    // 模拟业务处理
    await new Promise((resolve) => setTimeout(resolve, 500));

    this.logger.log(`[TaskHandler] Exam force submit completed: ${examId}`);
    return { submitted: true };
  }

  /**
   * 处理高优先级任务（演示不同队列）
   */
  @TaskHandler('critical.task', QueueName.CRITICAL)
  async handleCriticalTask(job: Job<{ priority: number }>): Promise<void> {
    this.logger.log(
      `[TaskHandler] Processing critical task: ${job.id}, priority: ${job.data.priority}`,
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    this.logger.log(`[TaskHandler] Critical task completed: ${job.id}`);
  }
}
