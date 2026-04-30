---
name: cache-wrap
description: 用 CacheService.wrap 自动完成「查缓存 → miss 回源 → 写缓存 → 返回」流程，防止缓存击穿；支持 unless 条件不缓存。
type: atomic
tags: [cache, wrap]
when_to_use: 关键词 — cache, redis, wrap, cache-aside
---


# Redis 缓存 (Cache Wrap)

`CacheService.wrap` 一行替代手写的「读 -> miss -> 查 DB -> 回写 -> 返回」逻辑，并内置防击穿。**禁止在工程内手写等价逻辑**。

```typescript
import { CacheService } from '@libs/core/nest/cache/cache.service';

@Injectable()
export class UserService {
  constructor(private readonly cacheService: CacheService) {}

  async getUserInfo(userId: string) {
    return this.cacheService.wrap(
      {
        key: `user:info:${userId}`,
        ttl: 60,                             // 秒
        unless: (result) => !result,         // 结果为空时不缓存
      },
      async () => this.userRepo.findOne(userId),
    );
  }
}
```

## 要点

- `key` 命名：业务前缀 + 资源类型 + ID，避免冲突
- `ttl` 必填，避免无界缓存
- `unless` 适合避免缓存空对象 / 错误中间态
- 写入操作后应主动 `del` 失效，或用更短的 TTL

## 相关 skill

- `redis-kv` — 直接 set/get 自定义结构时的序列化规范
