import {
  Controller,
  Post,
  Body,
  Logger,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { EventPattern, Payload, Transport } from '@nestjs/microservices';
import { KafkaEventPublisher } from '@app/core/nest/mq/kafka-publisher.service';
import { RabbitEventPublisher } from '@app/core/nest/mq/rabbit-publisher.service';
import { MqDevFilterGuard } from '@app/core/nest/mq/mq-dev-filter.guard';
import { KafkaEvent } from '@app/core/nest/mq/kafka-event.decorator';
import { RabbitAckInterceptor } from '@app/core/nest/mq/rabbit-ack.interceptor';
import { KafkaCommitInterceptor } from '@app/core/nest/mq/kafka-commit.interceptor';

interface testMqPayload {
  key: number;
  value: string;
}

@Controller('mq-test')
@UseGuards(MqDevFilterGuard)
export class MqTestController {
  private readonly logger = new Logger(MqTestController.name);

  constructor(
    private readonly kafkaPublisher: KafkaEventPublisher,
    private readonly rabbitPublisher: RabbitEventPublisher,
  ) {}

  @Post('kafka/publish')
  async publishKafka(@Body() body: testMqPayload) {
    this.logger.log(`Publishing to Kafka: ${JSON.stringify(body)}`);
    await this.kafkaPublisher.publish({
      name: 'test-topic',
      payload: body,
      key: body.key?.toString(),
    });
    return { success: true };
  }

  @Post('rabbit/publish')
  async publishRabbit(@Body() body: testMqPayload) {
    this.logger.log(`Publishing to RabbitMQ: ${JSON.stringify(body)}`);
    await this.rabbitPublisher.publish({
      name: 'test-event',
      payload: body,
    });
    return { success: true };
  }

  // Kafka Consumer
  @KafkaEvent('test-topic')
  @UseInterceptors(KafkaCommitInterceptor)
  handleKafkaMessage(@Payload() message: testMqPayload) {
    this.logger.log(
      `[Kafka Consumer] Received: ${JSON.stringify(message.value)}`,
    );
  }

  // RabbitMQ Consumer
  @EventPattern('test-event', Transport.RMQ)
  @UseInterceptors(RabbitAckInterceptor)
  handleRabbitMessage(@Payload() data: testMqPayload) {
    this.logger.log(`[RabbitMQ Consumer] Received: ${JSON.stringify(data)}`);
    // 模拟测试失败重试
    if (data.value === 'fail') {
      throw new Error('Simulated failure');
    }
  }
}
