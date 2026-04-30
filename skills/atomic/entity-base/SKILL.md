---
name: entity-base
description: TypeORM 实体必须继承 EntityWithId 或 EntityWithIdAndTimeTrace，自动获得 Snowflake ID 与 createdAt/updatedAt；可叠加 WithScopeStrategy/WithAuditor 等 Mixin。
when_to_use: 关键词 — entity, typeorm, base-entity, snowflake, mixin
---


# 数据库实体基类

`libs/entities` 提供基类，自动处理 ID 生成与时间戳。**禁止自行定义 id/createdAt/updatedAt 字段**。

## 基类

| 类 | 字段 |
| - | - |
| `EntityWithId` | `id` (Snowflake) |
| `EntityWithIdAndTimeTrace` | `id` + `createdAt` + `updatedAt`（自动维护） |

## 用法

```typescript
import { EntityWithIdAndTimeTrace } from '@libs/entities/base/WithIdAndTimeTrace';
import { Entity, Column } from 'typeorm';

@Entity()
export class Student extends EntityWithIdAndTimeTrace {
  @Column() name: string;
}
```

## Mixin 叠加

通过 `libs/entities/base/extendable` 中的 Mixin 增加横切字段：

- `WithScopeStrategy(Base)` — 加 `scope_strategy` / `scope_dept_id` / `scope_creator_id`，配合 `data-scope`
- `WithAuditor(Base)` — 自动追踪创建/更新人

```typescript
@Entity()
export class CustomSubject extends WithAuditor(WithScopeStrategy(EntityWithIdAndTimeTrace)) {
  @Column() name: string;
}
```

## 相关 skill

- `data-scope` — 行级数据范围
- `service-paradigm` — Service 查询返回实体聚合
