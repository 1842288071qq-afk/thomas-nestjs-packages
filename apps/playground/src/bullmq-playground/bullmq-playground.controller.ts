import { Controller, Get, Post, Body, Logger, Query } from '@nestjs/common';
import {
  TaskService,
  QueueName,
  CronService,
} from '@qyy-code-lego/nestjs/core/nest/bullmq';
import { Public } from '@qyy-code-lego/nestjs/core/nest/jwt-auth/decorator/public.decorator';

/**
 * BullMQ Playground Controller
 *
 * 用于测试 BullMQ 核心模块的功能
 */
@Public()
@Controller('bullmq')
export class BullmqPlaygroundController {
  private readonly logger = new Logger(BullmqPlaygroundController.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly cronService: CronService,
  ) {}

  /**
   * 添加异步任务
   */
  @Post('task')
  async addTask(
    @Body()
    body: {
      name: string;
      bizKey: string;
      data?: Record<string, unknown>;
      delay?: number;
    },
  ) {
    const job = await this.taskService.addTask({
      queue: QueueName.ASYNC,
      name: body.name,
      bizKey: body.bizKey,
      data: body.data || {},
      delay: body.delay,
    });

    this.logger.log(`Task added: ${job?.id}`);

    return {
      jobId: job?.id,
      name: job?.name,
      data: job?.data,
    };
  }

  /**
   * 查询任务状态
   */
  @Get('task/status')
  async getTaskStatus(@Query('jobId') jobId: string) {
    const status = await this.taskService.getTaskStatus(QueueName.ASYNC, jobId);
    return status;
  }

  /**
   * 动态注册 Cron 任务（仅演示）
   */
  @Post('cron')
  async registerCron(@Body() body: { name: string; cron: string }) {
    await this.cronService.registerCron({
      name: body.name,
      cron: body.cron,
      handler: async () => {
        this.logger.log(`Cron job executed: ${body.name}`);
        await Promise.resolve();
      },
    });

    return { success: true, name: body.name, cron: body.cron };
  }

  /**
   * 移除 Cron 任务
   */
  @Post('cron/remove')
  async removeCron(@Body() body: { name: string }) {
    const removed = await this.cronService.removeCron(body.name);
    return { success: removed, name: body.name };
  }

  /**
   * 获取所有队列列表
   */
  @Get('queues')
  async listQueues() {
    return Promise.resolve(this.taskService.getQueues());
  }

  /**
   * 获取队列指标
   */
  @Get('queue/metrics')
  async getQueueMetrics(@Query('queue') queue: QueueName) {
    return this.taskService.getQueueMetrics(queue);
  }
}
