import { JobsOptions } from 'bullmq';

/**
 * 队列名称枚举
 * - cron: 定时任务队列
 * - async: 异步业务任务队列
 * - critical: 高优先级任务队列
 */
export enum QueueName {
  CRON = 'cron',
  ASYNC = 'async',
  CRITICAL = 'critical',
}

/**
 * 添加任务参数接口
 */
export interface AddTaskOptions<T = unknown> {
  /** 队列名称 */
  queue: QueueName;
  /** 任务名称（业务语义） */
  name: string;
  /** 任务数据 */
  data: T;
  /** 业务唯一键，用于生成幂等 jobId */
  bizKey: string;
  /** 延迟执行时间（毫秒） */
  delay?: number;
  /** 优先级（数字越小优先级越高） */
  priority?: number;
  /** 额外的 BullMQ Job 选项 */
  jobOptions?: Omit<JobsOptions, 'jobId' | 'delay' | 'priority'>;
}

/**
 * Cron 任务定义接口
 */
export interface CronJobDefinition {
  /** Cron 任务名称 */
  name: string;
  /** Cron 表达式 */
  cron: string;
  /** 任务处理函数 */
  handler: () => Promise<void>;
  /** 任务描述 */
  description?: string;
  /** 静默 debug 日志：跳过「执行中 / 已完成」类 debug 日志，失败/警告日志不受影响 */
  silentDebug?: boolean;
}

/**
 * BullMQ 模块配置接口
 */
export interface BullMQModuleOptions {
  /** Redis 连接配置 */
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  /** 默认任务选项 */
  defaultJobOptions?: JobsOptions;
}

/**
 * 任务处理结果
 */
export interface TaskResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
