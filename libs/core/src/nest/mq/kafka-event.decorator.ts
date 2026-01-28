import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { KafkaCommitInterceptor } from './kafka-commit.interceptor';

/**
 * 封装 Kafka 事件处理器装饰器
 * 包含事件模型订阅 + 业务处理成功后自动提交 Offset
 * @param topic 订阅的主题
 */
export function KafkaEvent(topic: string) {
  return applyDecorators(
    EventPattern(topic),
    UseInterceptors(KafkaCommitInterceptor),
  );
}
