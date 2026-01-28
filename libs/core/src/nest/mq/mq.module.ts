import {
  DynamicModule,
  Global,
  Module,
  INestApplication,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaEventPublisher } from './kafka-publisher.service';
import { RabbitEventPublisher } from './rabbit-publisher.service';
import { MqConfig } from './mq.types';
import { MqDevFilterGuard } from './mq-dev-filter.guard';
import { KafkaCommitInterceptor } from './kafka-commit.interceptor';
import { RabbitAckInterceptor } from './rabbit-ack.interceptor';

@Global()
@Module({})
export class MqModule {
  static register(): DynamicModule {
    return {
      module: MqModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name: 'KAFKA_CLIENT',
            useFactory: (configService: ConfigService) => {
              const mqConfig = configService.get<MqConfig>('mq');
              const kafkaConfig = mqConfig?.kafka;
              return {
                transport: Transport.KAFKA,
                options: {
                  client: {
                    clientId: kafkaConfig?.clientId || 'wjy-api',
                    brokers: kafkaConfig?.brokers || ['kafka:9092'],
                  },
                  consumer: {
                    groupId: kafkaConfig?.groupId || 'wjy-consumer-group',
                    allowAutoCommit: false,
                  },
                },
              };
            },
            inject: [ConfigService],
          },
          {
            name: 'RABBIT_CLIENT',
            useFactory: (configService: ConfigService) => {
              const mqConfig = configService.get<MqConfig>('mq');
              const rabbitConfig = mqConfig?.rabbit;
              return {
                transport: Transport.RMQ,
                options: {
                  urls: rabbitConfig?.urls || ['amqp://localhost:5672'],
                  queue: rabbitConfig?.queue || 'default_queue',
                  queueOptions: rabbitConfig?.queueOptions || {
                    durable: true,
                  },
                  noAck: false,
                },
              };
            },
            inject: [ConfigService],
          },
        ]),
      ],
      providers: [
        KafkaEventPublisher,
        RabbitEventPublisher,
        MqDevFilterGuard,
        KafkaCommitInterceptor,
        RabbitAckInterceptor,
      ],
      exports: [
        ClientsModule,
        KafkaEventPublisher,
        RabbitEventPublisher,
        MqDevFilterGuard,
        KafkaCommitInterceptor,
        RabbitAckInterceptor,
      ],
    };
  }

  /**
   * 一键启动 MQ 微服务监听 (Kafka & RabbitMQ)
   * 根据配置自动决定连接哪些服务
   */
  static connectMicroservices(app: INestApplication) {
    const configService = app.get(ConfigService);
    const mqConfig = configService.get<MqConfig>('mq');

    // 连接 Kafka
    if (mqConfig?.kafka) {
      app.connectMicroservice({
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: mqConfig.kafka.clientId,
            brokers: mqConfig.kafka.brokers,
          },
          consumer: {
            groupId: mqConfig.kafka.groupId,
            allowAutoCommit: false,
          },
        },
      });
    }

    // 连接 RabbitMQ
    if (mqConfig?.rabbit) {
      app.connectMicroservice({
        transport: Transport.RMQ,
        options: {
          urls: mqConfig.rabbit.urls,
          queue: mqConfig.rabbit.queue,
          noAck: false,
          queueOptions: mqConfig.rabbit.queueOptions,
        },
      });
    }
  }
}
