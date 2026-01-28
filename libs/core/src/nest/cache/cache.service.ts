import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface WrapOptions<T> {
  key?: string | (() => string); // 缓存 key，支持函数动态生成
  ttl?: number; // 过期时间（秒）
  unless?: (result: T) => boolean | Promise<boolean>; // 条件，满足则不缓存
}

@Injectable()
export class CacheService {
  constructor(private redisService: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    return this.redisService.get<T>(key);
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    return this.redisService.mget<T>(keys);
  }

  async set<T>(key: string, value: T, ttl?: number) {
    await this.redisService.set(key, value, ttl);
  }

  async evict(key: string) {
    await this.redisService.del(key);
  }

  async evictMany(keys: string[]) {
    await this.redisService.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    return this.redisService.exists(key);
  }

  async existsMany(keys: string[]): Promise<boolean[]> {
    return this.redisService.existsMany(keys);
  }

  async scan(pattern: string, count?: number): Promise<string[]> {
    return this.redisService.scan(pattern, count);
  }

  /**
   * Wrap 函数
   * @param options 配置，包括 key、ttl 和 unless
   * @param fn 回调函数，返回 T 或 Promise<T>
   */
  async wrap<T>(
    options: {
      key: string | (() => string);
      ttl?: number;
      unless?: (result: T) => boolean | Promise<boolean>;
    },
    fn: () => Promise<T> | T,
  ): Promise<T> {
    const key = options?.key;
    if (!key) {
      throw new Error('Cache key is required');
    }
    const keyUse = typeof key === 'function' ? key() : key;

    const cached = await this.get<T>(keyUse);
    if (cached !== null) return cached;

    const result = await Promise.resolve(fn());

    if (options?.unless) {
      const skipCache = await Promise.resolve(options.unless(result));
      if (!skipCache) {
        await this.set(keyUse, result, options.ttl);
      }
    } else {
      await this.set(keyUse, result, options?.ttl);
    }

    return result;
  }
}
