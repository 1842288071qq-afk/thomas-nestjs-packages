import { registerAs } from '@nestjs/config';

export const mqConfig = registerAs('mq', () => ({
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'playground-kafka',
    brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
    groupId: process.env.KAFKA_GROUP_ID || 'playground-group',
    // Consumer 配置
    consumer: {
      // sessionTimeout: Kafka consumer 会话超时时间（毫秒）
      // 默认值为 30000ms (30秒)，这里设置为一个很小的值 6000ms (6秒) 用于测试
      // 如果 consumer 在此时间内未发送心跳，会被认为已死亡并触发 rebalance
      sessionTimeout: parseInt(process.env.KAFKA_SESSION_TIMEOUT || '6000', 10),
      // heartbeatInterval: 心跳间隔时间（毫秒），应小于 sessionTimeout
      // 默认值为 3000ms (3秒)，这里设置为 2000ms
      heartbeatInterval: parseInt(
        process.env.KAFKA_HEARTBEAT_INTERVAL || '2000',
        10,
      ),
      // rebalanceTimeout: Rebalance 超时时间（毫秒）
      // 默认值为 60000ms (60秒)
      rebalanceTimeout: parseInt(
        process.env.KAFKA_REBALANCE_TIMEOUT || '60000',
        10,
      ),
    },
  },
  rabbit: {
    urls: (process.env.RABBIT_URLS || 'amqp://localhost:5672').split(','),
    queue: process.env.RABBIT_QUEUE || 'playground-queue',
    queueOptions: {
      durable: true,
    },
  },
}));
