import { Controller } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { KafkaEvent } from '../mq/kafka-event.decorator';
import { REQUEST_LOGS_DEFAULT_KAFKA_TOPIC } from './constants';
import { RequestLogsService } from './request-logs.service';

@Controller()
export class RequestLogsKafkaConsumer {
  constructor(private readonly requestLogsService: RequestLogsService) {}

  @KafkaEvent(REQUEST_LOGS_DEFAULT_KAFKA_TOPIC)
  async consume(@Payload() payload: unknown) {
    const normalized =
      payload && typeof payload === 'object' && 'value' in payload
        ? (payload as { value?: unknown }).value
        : payload;

    await this.requestLogsService.consumeKafkaLog(normalized);
  }
}
