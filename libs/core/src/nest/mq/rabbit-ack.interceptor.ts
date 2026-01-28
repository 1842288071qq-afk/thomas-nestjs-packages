import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

interface XDeathHeader {
  count: number;
  reason: string;
  queue: string;
  time: {
    '!': 'timestamp';
    value: number;
  };
  exchange: string;
  ['routing-keys']: string[];
}

/**
 * RabbitMQ 手动确认与重试拦截器
 * 处理逻辑：
 * 1. 业务成功 -> 手动 Ack
 * 2. 业务失败 -> 判断重试次数
 *    - 未达到上限：手动 Nack 并 Requeue
 *    - 达到上限：手动 Nack 不 Requeue (进入死信队列，需配合队列的 x-dead-letter-exchange 配置)
 */
@Injectable()
export class RabbitAckInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RabbitAckInterceptor.name);
  private readonly MAX_RETRY = 3;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const rpcContext = context.switchToRpc();
    // 确保是 RabbitMQ 上下文
    let rmqContext: RmqContext;
    try {
      rmqContext = rpcContext.getContext<RmqContext>();
    } catch (_e) {
      return next.handle();
    }

    if (!rmqContext || typeof rmqContext.getChannelRef !== 'function') {
      return next.handle();
    }

    const channel = rmqContext.getChannelRef() as Channel;
    const message = rmqContext.getMessage() as Message;

    return next.handle().pipe(
      tap(() => {
        // 只有业务处理成功才会执行到这里
        try {
          channel.ack(message);
        } catch (err) {
          this.logger.error('[RabbitMQ] Failed to ack message', err);
        }
      }),
      catchError((err: Error) => {
        this.handleFailure(channel, message, err);
        // 让错误继续向下传递，触发全局错误处理或日志
        return throwError(() => err);
      }),
    );
  }

  private handleFailure(channel: Channel, message: Message, error: Error) {
    const pattern = message.fields?.routingKey || 'unknown';

    // 获取重试次数（从 x-death 或自定义 header）
    const retryCount = this.getRetryCount(message);

    if (retryCount < this.MAX_RETRY) {
      this.logger.warn(
        `[RabbitMQ] Msg [${pattern}] failed, requeueing (${
          retryCount + 1
        }/${this.MAX_RETRY}). Error: ${error.message}`,
      );
      // requeue: true 再次投递
      channel.nack(message, false, true);
    } else {
      this.logger.error(
        `[RabbitMQ] Msg [${pattern}] failed after ${this.MAX_RETRY} retries. Moving to Dead Letter / Discarding.`,
      );
      // requeue: false
      channel.nack(message, false, false);
    }
  }

  private getRetryCount(message: Message): number {
    const headers = message.properties?.headers || {};
    // 1. 检查是否有 x-death (由 RMQ 死信机制自动添加)
    const xDeath = headers['x-death'] as XDeathHeader[];
    if (Array.isArray(xDeath) && xDeath.length > 0) {
      // 消息可能经过多个死信交换机，取第一个
      return xDeath[0].count || 0;
    }

    // 2. 备选方案：自定义重试 header
    return (headers['x-retry-count'] as number) || 0;
  }
}
