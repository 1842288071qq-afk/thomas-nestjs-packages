import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { DomainEvent, EventPublisher } from './mq.types';

@Injectable()
export class RabbitEventPublisher implements EventPublisher {
  constructor(
    @Inject('RABBIT_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    await lastValueFrom(this.client.emit(event.name, event.payload));
  }
}
