import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  const db = parseInt(process.env.REDIS_DB || '0', 10);
  return {
    default: {
      host,
      port,
      password,
      db,
    },
    bullmq: {
      host,
      port,
      password,
      db: db + 1,
    },
  };
});
