import { JobsOptions } from 'bullmq';
import { QueueName } from './bullmq.types';

/**
 * 模块配置注入令牌
 */
export const BULLMQ_MODULE_OPTIONS = Symbol('BULLMQ_MODULE_OPTIONS');

/**
 * 队列名称常量列表
 */
export const QUEUE_NAMES: QueueName[] = [
  QueueName.CRON,
  QueueName.ASYNC,
  QueueName.CRITICAL,
];

/**
 * 默认任务选项
 * - 最多重试 3 次
 * - 指数退避策略，初始延迟 3 秒
 * - 完成后自动删除
 * - 失败后保留 7 天
 */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 3000,
  },
  removeOnComplete: {
    age: 3600, // 1 小时后删除完成的任务
    count: 1000, // 最多保留 1000 个完成的任务
  },
  removeOnFail: {
    age: 604800, // 7 天后删除失败的任务
  },
};

/**
 * 任务处理装饰器元数据 Key
 */
export const TASK_HANDLER_METADATA = 'TASK_HANDLER_METADATA';

/**
 * Cron 处理装饰器元数据 Key
 */
export const CRON_HANDLER_METADATA = 'CRON_HANDLER_METADATA';
