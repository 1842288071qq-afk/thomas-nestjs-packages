import { Injectable } from '@nestjs/common';
import { CronJobDefinition } from '../bullmq.types';

/**
 * Cron 任务注册表
 *
 * 存储和管理所有注册的 Cron 任务定义
 */
@Injectable()
export class CronRegistry {
  private readonly cronJobs = new Map<string, CronJobDefinition>();

  /**
   * 注册 Cron 任务
   *
   * @param definition Cron 任务定义
   */
  register(definition: CronJobDefinition): void {
    if (this.cronJobs.has(definition.name)) {
      throw new Error(`Cron job "${definition.name}" already registered`);
    }
    this.cronJobs.set(definition.name, definition);
  }

  /**
   * 获取所有已注册的 Cron 任务
   */
  getAll(): CronJobDefinition[] {
    return Array.from(this.cronJobs.values());
  }

  /**
   * 获取指定 Cron 任务
   */
  get(name: string): CronJobDefinition | undefined {
    return this.cronJobs.get(name);
  }

  /**
   * 检查 Cron 任务是否已注册
   */
  has(name: string): boolean {
    return this.cronJobs.has(name);
  }
}
