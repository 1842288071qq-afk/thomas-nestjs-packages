import os from 'os';

export const getKafkaConfig = () => {
  const baseGroupId = process.env.KAFKA_GROUP_ID || 'kafka-nestjs-group';
  const rawDevName = process.env.DEV_NAME || os.hostname();

  // 清理 devName，确保符合 Kafka Consumer Group ID 命名规范
  // 1. 转换为小写
  // 2. 替换特殊字符（. 空格等）为 -
  // 3. 移除连续的 - 和首尾的 -
  const devName = rawDevName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-') // 只保留字母、数字、- 和 _
    .replace(/-+/g, '-') // 将连续的 - 替换为单个 -
    .replace(/^-+|-+$/g, ''); // 移除首尾的 -

  // 如果配置了 DEV_NAME，自动在 groupId 后面加上开发者标识
  // 这样可以确保不同开发者使用不同的 Consumer Group，避免消息抢占
  const groupId = devName ? `${baseGroupId}-${devName}` : baseGroupId;

  return {
    clientId: process.env.KAFKA_CLIENT_ID || 'kafka-nestjs-client',
    brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
    groupId,
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
  };
};

export const getRabbitConfig = () => ({
  urls: (process.env.RABBIT_URLS || 'amqp://localhost:5672').split(','),
  queue: process.env.RABBIT_QUEUE || 'rabbit-nestjs-queue',
  queueOptions: {
    durable: true,
  },
});
