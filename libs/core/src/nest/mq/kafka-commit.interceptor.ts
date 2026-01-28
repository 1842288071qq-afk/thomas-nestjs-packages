import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { KafkaContext } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Kafka 自动提交 Offset 拦截器
 * 用于在业务处理成功后手动提交 Kafka Offset
 */
@Injectable()
export class KafkaCommitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(KafkaCommitInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const rpcContext = context.switchToRpc();
    // 兼容之前的 Guard 逻辑，确保是 Kafka 上下文
    const kafkaContext = rpcContext.getContext<KafkaContext>();

    // 如果不是 Kafka 上下文，或者不是预期的 Kafka 对象，直接跳过
    if (
      !kafkaContext ||
      typeof kafkaContext.getConsumer !== 'function' ||
      !(kafkaContext instanceof KafkaContext)
    ) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const consumer = kafkaContext.getConsumer();
          const message = kafkaContext.getMessage();
          const topic = kafkaContext.getTopic();
          const partition = kafkaContext.getPartition();

          // 这是一个异步操作，但 tap 不支持返回 Promise
          // 我们在这里触发异步提交，不阻塞后续流程
          void (async () => {
            try {
              // 只有业务处理成功（没有抛出异常）才会执行到这里
              // 提交当前消息的 offset
              await consumer.commitOffsets([
                {
                  topic,
                  partition,
                  offset: (BigInt(message.offset) + 1n).toString(),
                },
              ]);
            } catch (err) {
              this.logger.error(
                `[Kafka] Failed to commit offset for topic: ${topic}`,
                err instanceof Error ? err.stack : String(err),
              );
            }
          })();
        },
      }),
    );
  }
}
