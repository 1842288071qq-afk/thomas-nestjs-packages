import { registerAs } from '@nestjs/config';

export const mqConfig = registerAs('mq', () => ({
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'playground-kafka',
    brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
    groupId: process.env.KAFKA_GROUP_ID || 'playground-group',
  },
  rabbit: {
    urls: (process.env.RABBIT_URLS || 'amqp://localhost:5672').split(','),
    queue: process.env.RABBIT_QUEUE || 'playground-queue',
    queueOptions: {
      durable: true,
    },
  },
}));
