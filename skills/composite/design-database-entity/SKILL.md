---
name: design-database-entity
description: 设计数据库实体 — 继承 EntityWithIdAndTimeTrace 自动获得 Snowflake ID 与时间戳；行级权限叠 WithScopeStrategy；审计叠 WithAuditor；命名/索引/关系约定。
type: composite
tags: [entity, database, schema, typeorm, design]
---

# 数据库实体设计

## 1. 选基类

| 场景 | 基类 |
| - | - |
| 仅需 ID | `EntityWithId` |
| 业务实体（默认） | `EntityWithIdAndTimeTrace` — 自动维护 `createdAt`/`updatedAt` |

**禁止自定义 `id`/`createdAt`/`updatedAt` 字段。** 详见 `entity-base`。

## 2. 叠加 Mixin（按需）

- 行级数据权限 → `WithScopeStrategy(Base)`，配合 `data-scope`
- 创建/更新人审计 → `WithAuditor(Base)`
- 通常组合：`WithAuditor(WithScopeStrategy(EntityWithIdAndTimeTrace))`

## 3. 字段命名

- 列名使用 `snake_case`（数据库），TypeScript 属性 `camelCase`
- 业务编码列保留语义后缀：`xxxCode`、`xxxType`、`xxxStatus`
- 软删用 TypeORM `@DeleteDateColumn() deletedAt: Date`，查询不要手拼 `deletedAt IS NULL`

## 4. 索引建议

- 查询条件高频字段（`hospitalId`、`createdAt`、状态码）建索引
- 唯一性约束（手机号、用户名）建唯一索引并在 Service 层显式查重抛 `BizError`
- 复合索引按区分度高的列在前

## 5. 关系定义

- 使用 TypeORM 关系装饰器（`@OneToMany` / `@ManyToOne` / `@OneToOne`），通过 `leftJoinAndSelect` 取数（参见 `service-paradigm` 查询分层）
- 反向关系字段建议命名为复数（`profiles`、`schedules`）

## 6. 模板

```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { EntityWithIdAndTimeTrace } from '@libs/entities/base/WithIdAndTimeTrace';
import { WithScopeStrategy, WithAuditor } from '@libs/entities/base/extendable';

@Entity('biz_custom_subject')
export class CustomSubject extends WithAuditor(WithScopeStrategy(EntityWithIdAndTimeTrace)) {
  @Column({ length: 64 }) name: string;

  @Column({ name: 'hospital_id' }) hospitalId: string;

  @Column({ name: 'subject_type', length: 16 }) subjectType: string;

  @ManyToOne(() => CustomCategory, c => c.subjects)
  @JoinColumn({ name: 'category_id' })
  category: CustomCategory;
}
```

## 相关 skill

- `entity-base`、`data-scope`
- `service-paradigm` — 查询基于实体关系
