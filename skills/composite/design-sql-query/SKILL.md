---
name: design-sql-query
description: 设计 TypeORM 查询/SQL — 优先 leftJoinAndSelect 拿关系数据，范围条件按 ParseRange 解析结果拼 BETWEEN/>=/<=，行级权限 dataScopeEngine.apply，分页用 skip+take+getManyAndCount。
type: composite
tags: [sql, typeorm, querybuilder, query, design, join]
---

# 数据库查询 / SQL 设计

## 1. 优先 Entity Relation

能用 TypeORM 关系拿到的数据**不要退化到 raw 字段映射**。常见模式：

```typescript
const qb = this.repo.createQueryBuilder('relation')
  .leftJoinAndSelect('relation.profile', 'profile')
  .leftJoinAndSelect('profile.schedule', 'schedule');
```

仅在确有性能/字段裁剪诉求时再考虑 `addSelect` / `getRawAndEntities`，并明确写明理由。

## 2. 软删除

- 普通查询 TypeORM 自动排除软删数据，**不要在 join 条件手拼 `deletedAt IS NULL`**
- 需要历史数据：`qb.withDeleted()`

## 3. 范围 / 区间条件

DTO 用 `@ParseRange` / `@ParseDateTimeRange`，Service 按数组元素是否存在拼条件：

```typescript
if (createTimeRange?.length === 2) {
  const [s, e] = createTimeRange;
  if (s && e) qb.andWhere('e.createdAt BETWEEN :s AND :e', { s, e });
  else if (s) qb.andWhere('e.createdAt >= :s', { s });
  else if (e) qb.andWhere('e.createdAt <= :e', { e });
}
```

详见 `range-query`。

## 4. 行级数据权限

每个支持范围控制的实体的查询都应在最后注入：

```typescript
this.dataScopeEngine.apply({ qb, searcher: { id: user.id, deptId: user.deptId } });
```

详见 `data-scope`。

## 5. 分页

```typescript
const [rows, total] = await qb
  .orderBy('e.createdAt', 'DESC')
  .skip((page - 1) * pageSize).take(pageSize)
  .getManyAndCount();
return { rows, total, page, pageSize };
```

需要复杂去重/聚合的分页用 `qb.clone().getCount()` 拿 total，避免 `getManyAndCount` 与 join 的笛卡尔放大。

## 6. 写入

- 唯一字段先查重抛 `BizError`，再 `repo.save(repo.create(...))`
- 批量写入考虑 `repo.upsert` 或 `repo.save(arr, { chunk: 200 })`
- 跨表事务用 `dataSource.transaction` 或 `@Transactional`（如已封装）

## 相关 skill

- `service-paradigm` — 查询分层
- `pagination-and-list` — 分页签名
- `range-query`、`data-scope`、`entity-base`
