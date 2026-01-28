// config/redis.config.ts
export interface RedisClientConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface RedisConfig {
  default: RedisClientConfig;
  // 根据需要自行扩展
  [key: string]: RedisClientConfig;
}
