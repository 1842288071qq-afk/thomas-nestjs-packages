import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { RedisConfig, RedisClientConfig } from './redis.types';
import { RedisHelper } from './redis.helper';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly clients = new Map<string, Redis>();

  constructor(private readonly configService: ConfigService) {}

  private readonly logger = new Logger(RedisService.name);

  getClient(name: keyof RedisConfig = 'default'): Redis {
    if (this.clients.has(name as string)) {
      return this.clients.get(name as string)!;
    }

    const redisConfig = this.configService.get<RedisConfig>('redis');
    const config =
      redisConfig && redisConfig[name]
        ? redisConfig[name]
        : this.getDefaultConfig();

    const client = this.createClient(config);

    this.clients.set(name as string, client);
    return client;
  }

  /**
   * 仅限于KV模式的工具
   * @param name
   * @returns
   */
  getHelper(name: keyof RedisConfig = 'default'): RedisHelper {
    const client = this.getClient(name);
    return new RedisHelper(client);
  }

  private createClient(config: RedisClientConfig): Redis {
    const options: RedisOptions = {
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      lazyConnect: true,
      maxRetriesPerRequest: null,
      keyPrefix: config.keyPrefix || '',
    };

    const client = new Redis(options);

    client.on('connect', () => {
      this.logger.log(
        `[Redis] connected ${options.host}:${options.port} db:${options.db}`,
      );
    });

    client.on('error', (err) => {
      this.logger.error('[Redis] error', err);
    });

    return client;
  }

  private getDefaultConfig(): RedisClientConfig {
    return {
      host: 'localhost',
      port: 6379,
      password: undefined,
      db: 0,
    };
  }

  async get<T = string>(key: string): Promise<T | null> {
    return this.getHelper().get<T>(key);
  }

  async mget<T = string>(keys: string[]): Promise<(T | null)[]> {
    return this.getHelper().mget<T>(keys);
  }

  async set(key: string, value: unknown, ttlSeconds?: number) {
    await this.getHelper().set(key, value, ttlSeconds);
  }

  async del(...keys: string[]) {
    await this.getHelper().del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    return this.getHelper().exists(key);
  }

  async existsMany(keys: string[]): Promise<boolean[]> {
    return this.getHelper().existsMany(keys);
  }

  async scan(pattern: string, count?: number): Promise<string[]> {
    return this.getHelper().scan(pattern, count);
  }

  async hset(key: string, field: string, value: unknown) {
    await this.getHelper().hset(key, field, value);
  }

  async hmset(key: string, data: Record<string, unknown>) {
    await this.getHelper().hmset(key, data);
  }

  async hget<T = string>(key: string, field: string): Promise<T | null> {
    return this.getHelper().hget<T>(key, field);
  }

  async hmget<T = string>(
    key: string,
    fields: string[],
  ): Promise<(T | null)[]> {
    return this.getHelper().hmget<T>(key, fields);
  }

  async hdel(key: string, ...fields: string[]) {
    await this.getHelper().hdel(key, ...fields);
  }

  async onModuleDestroy() {
    for (const client of this.clients.values()) {
      await client.quit();
    }
  }
}
