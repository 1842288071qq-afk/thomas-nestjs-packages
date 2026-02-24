import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { DomainEvent, EventPublisher } from './mq.types';
import { AppConfig } from '@thomas/nestjs/common/config/config.interface';

@Injectable()
export class KafkaEventPublisher implements EventPublisher, OnModuleInit {
  constructor(
    @Inject('KAFKA_CLIENT')
    private readonly client: ClientKafka,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.client.connect();
  }

  async publish(event: DomainEvent): Promise<void> {
    const devName = this.configService.get<AppConfig>('app')?.devName;
    await lastValueFrom(
      this.client.emit(event.name, {
        key: event.key || '',
        value: event.payload,
        headers: devName ? { 'x-dev-name': devName } : {},
      }),
    );
  }
}
