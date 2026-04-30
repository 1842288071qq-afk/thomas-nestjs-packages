---
name: redis-kv
description: RedisService.set/get 已内置 JSON 序列化，禁止手动 JSON.stringify/parse；get 用泛型指定返回类型。
when_to_use: 关键词 — redis, kv, serialization
---


# Redis KV 存储规范

`RedisService` 的 `set`/`get` 内置序列化，**禁止手动 JSON.stringify / JSON.parse**。

```typescript
// ✅ 直接存对象
await this.redisService.set('user:lock', { id: '1', name: 'Alice' });

// ✅ 泛型取回
const user = await this.redisService.get<{ id: string; name: string }>('user:lock');

// ❌ 错误
await this.redisService.set('key', JSON.stringify(obj));
const v = JSON.parse(await this.redisService.get('key'));
```

如需「读缓存 → miss 回源 → 写缓存」一体化流程，用 `cache-wrap`。

## 相关 skill

- `cache-wrap`
