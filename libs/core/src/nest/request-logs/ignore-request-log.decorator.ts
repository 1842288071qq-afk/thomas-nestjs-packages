import { SetMetadata } from '@nestjs/common';
import { REQUEST_LOG_IGNORE_METADATA } from './constants';

/**
 * 标记当前 Controller 或路由方法跳过请求日志：access log 与持久化均不记录。
 *
 * 适用于埋点等高频、记录无意义的接口（如 track/event、track/events）。
 * 可加在 @Controller 类上（覆盖该控制器全部路由），也可加在单个路由方法上。
 */
export const IgnoreRequestLog = () =>
  SetMetadata(REQUEST_LOG_IGNORE_METADATA, true);
