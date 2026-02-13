import Redis from 'ioredis';

/**
 * Redis 工具类，简化常用的 KV 操作
 */
export class RedisHelper {
  constructor(private readonly redis: Redis) {}

  async set(key: string, value: unknown, ttlSeconds?: number) {
    const data = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttlSeconds) {
      await this.redis.set(key, data, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, data);
    }
  }

  async get<T = string>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (value === null) return null;

    return this.parseValue<T>(value);
  }

  async mget<T = string>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    const values = await this.redis.mget(keys);
    return values.map((value) =>
      value === null ? null : this.parseValue<T>(value),
    );
  }

  private parseValue<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      // 不是 JSON，当字符串返回
      return value as unknown as T;
    }
  }

  async hset(key: string, field: string, value: unknown) {
    const data = typeof value === 'string' ? value : JSON.stringify(value);
    await this.redis.hset(key, field, data);
  }

  async hmset(key: string, data: Record<string, unknown>) {
    if (Object.keys(data).length === 0) return;
    const updateMap: Record<string, string> = {};
    for (const [field, value] of Object.entries(data)) {
      updateMap[field] =
        typeof value === 'string' ? value : JSON.stringify(value);
    }
    await this.redis.hmset(key, updateMap);
  }

  async hget<T = string>(key: string, field: string): Promise<T | null> {
    const value = await this.redis.hget(key, field);
    if (value === null) return null;
    return this.parseValue<T>(value);
  }

  async hmget<T = string>(
    key: string,
    fields: string[],
  ): Promise<(T | null)[]> {
    if (fields.length === 0) return [];
    const values = await this.redis.hmget(key, ...fields);
    return values.map((value) =>
      value === null ? null : this.parseValue<T>(value),
    );
  }

  async hdel(key: string, ...fields: string[]) {
    if (fields.length === 0) return;
    await this.redis.hdel(key, ...fields);
  }

  async del(...keys: string[]) {
    if (keys.length === 0) return;
    await this.redis.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async existsMany(keys: string[]): Promise<boolean[]> {
    if (keys.length === 0) return [];
    const pipeline = this.redis.pipeline();
    keys.forEach((key) => pipeline.exists(key));
    const results = await pipeline.exec();
    return results
      ? results.map(([, res]) => res === 1)
      : keys.map(() => false);
  }

  async scan(pattern: string, count = 100): Promise<string[]> {
    const keys: string[] = [];
    const prefix = this.redis.options.keyPrefix || '';
    let cursor = '0';
    do {
      const [nextCursor, foundKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        prefix + pattern,
        'COUNT',
        count,
      );
      cursor = nextCursor;
      // 这里的 key 是带 prefix 的，需要去掉，否则后面再次使用时 ioredis 会重复加前缀
      const strippedKeys = prefix
        ? foundKeys.map((key) =>
            key.startsWith(prefix) ? key.slice(prefix.length) : key,
          )
        : foundKeys;
      keys.push(...strippedKeys);
    } while (cursor !== '0');
    return keys;
  }

  // ==========================================
  // Set 操作
  // ==========================================

  async sadd(key: string, ...members: string[]) {
    if (members.length === 0) return;
    await this.redis.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return await this.redis.smembers(key);
  }

  async srem(key: string, ...members: string[]) {
    if (members.length === 0) return;
    await this.redis.srem(key, ...members);
  }
}
