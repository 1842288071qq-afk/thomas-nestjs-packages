---
name: implement-service
description: 实现 NestJS Service 的标准流程 — 上下文无关、interface 入参、对象参数、查询分层、缓存包裹、BizError 抛错、数据范围注入。
type: composite
tags: [service, nestjs]
when_to_use: 关键词 — service, nestjs, implement, business-logic
---


# 实现 Service 全流程

## 1. 强约束（不可违反）

- **禁止使用 ThreadLocal / Request**。需要的上下文（accountId、hospitalId、deptId、permissions 等）由 Controller 显式传入
- 入参类型用 `interface`，不直接引用 Controller 的 DTO Class
- 超过 3 个参数用对象参数 `{ ... }`（分页的 `page`/`pageSize` 例外）
- 查询返回 Entity 或聚合对象，**不构造展示态**；展示态属于 vo-transform
- 详见 `service-paradigm`

## 2. 业务前置校验

- 对必填、状态合法性做手动运行时校验，第一时间抛 `BizError`
- 详见 `biz-error`

## 3. 数据查询

- 优先 Entity Relation：`leftJoinAndSelect` + 关系字段
- 不手拼 `deletedAt IS NULL`，确需历史数据用 `withDeleted()`
- 范围条件按 `range-query` 模式拼 `BETWEEN/>=/<=`
- 行级权限调 `dataScopeEngine.apply({ qb, searcher })`，详见 `data-scope`
- 分页签名固定为 `(query, page, pageSize, ...其他必要上下文)` 返回 `IPageData<T>`，详见 `pagination-and-list`

## 4. 缓存

- 「读 → miss → 回源 → 回写」一律用 `cacheService.wrap({ key, ttl, unless }, fn)`
- 直接 KV 操作用 `RedisService.set/get`，禁手动 JSON 序列化
- 详见 `cache-wrap`、`redis-kv`

## 5. 敏感操作

- 密码等更新：单独的 Service 方法，不与综合维护方法共用入口
- 详见 `type-safety`

## 模板

```typescript
interface CreateUserInput {
  name: string; phone: string; hospitalId: string; createdBy: string;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    private readonly cacheService: CacheService,
    private readonly dataScopeEngine: DataScopeEngine,
  ) {}

  async createUser(input: CreateUserInput): Promise<User> {
    if (!input.phone) throw new BizError('手机号必填');
    const exists = await this.repo.findOne({ where: { phone: input.phone, hospitalId: input.hospitalId } });
    if (exists) throw new BizError('手机号已存在').codeAs(1001);
    return this.repo.save(this.repo.create(input));
  }

  async findUserPage(
    query: { username?: string; createTimeRange?: (string | null)[] },
    page: number, pageSize: number,
    hospitalId: string, searcher: { id: string; deptId: string },
  ): Promise<IPageData<User>> {
    const qb = this.repo.createQueryBuilder('u')
      .leftJoinAndSelect('u.profile', 'profile')
      .where('u.hospitalId = :hospitalId', { hospitalId });

    if (query.username) qb.andWhere('u.username LIKE :n', { n: `%${query.username}%` });
    if (query.createTimeRange?.length === 2) {
      const [s, e] = query.createTimeRange;
      if (s && e) qb.andWhere('u.createdAt BETWEEN :s AND :e', { s, e });
      else if (s) qb.andWhere('u.createdAt >= :s', { s });
      else if (e) qb.andWhere('u.createdAt <= :e', { e });
    }

    this.dataScopeEngine.apply({ qb, searcher });

    const [rows, total] = await qb.orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    return { rows, total, page, pageSize };
  }

  async getUserCached(id: string): Promise<User | null> {
    return this.cacheService.wrap(
      { key: `user:info:${id}`, ttl: 60, unless: r => !r },
      () => this.repo.findOne({ where: { id } }),
    );
  }
}
```

## 相关 skill

- `service-paradigm`
- `biz-error`
- `design-sql-query`
- `range-query`
- `data-scope`
- `pagination-and-list`
- `cache-wrap`
- `redis-kv`
- `type-safety`
