---
name: write-ddl
description: 在 docs/DDL/ 下编写建表 SQL — 遵循 sql-guide.md 规范：公共字段对齐 extendable；状态/枚举字段要与 Entity、DTO、dict 一致；禁止数据库外键；软删除表唯一索引加 WHERE deleted_at IS NULL。
type: composite
tags: [ddl, sql]
when_to_use: 关键词 — DDL, SQL, 建表, sql-guide, status, enum, ObjectActiveStatus
---


# 编写 DDL 建表 SQL

## 1. 文件位置

```
docs/DDL/
├── sql-guide.md        ← 规范（必读）
└── {功能名}.sql        ← 如：知识库模块.sql
```

**必须在 monorepo 根目录的 `docs/DDL/` 下创建，文件名使用中文功能名。**

## 2. 核心规范（来自 sql-guide.md）

### 2.1 公共字段对齐 extendable

| TypeORM Mixin | 对应 SQL 字段 | 类型 |
| - | - | - |
| `WithId` | `id VARCHAR(64) NOT NULL` | 主键 |
| `WithTimeTrace` | `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` | 时间戳 |
| `WithSoftDelete` | `deleted_at TIMESTAMPTZ NULL` | 软删除 |
| `WithAuditor` | `created_by VARCHAR(64) NULL` `updated_by VARCHAR(64) NULL` | 操作人 |
| `WithStatus` | `status VARCHAR(16) NOT NULL DEFAULT 'active'` | 通用启停状态 |

参考文件：`server/packages/@qyy-code-lego/nestjs/libs/entities/src/core/base/extendable.ts`

### 2.2 禁止数据库外键

```sql
-- ✅ 只保留语义字段，无 REFERENCES
tenant_id VARCHAR(64) NOT NULL COMMENT '租户 ID',
column_id VARCHAR(64) NOT NULL COMMENT '所属目录 ID',

-- ❌ 禁止
FOREIGN KEY (column_id) REFERENCES biz_article_column(id)
```

### 2.3 软删除表的唯一索引必须加过滤条件

```sql
-- ✅ 软删除表的唯一索引
CREATE UNIQUE INDEX uq_biz_article_column_name
ON biz_article_column (tenant_id, parent_id, name)
WHERE deleted_at IS NULL;

-- ❌ 不加过滤 = 删除后无法重建同名数据
UNIQUE (tenant_id, parent_id, name)
```

### 2.4 普通查询索引

```sql
-- 高频查询字段建普通索引
CREATE INDEX idx_biz_article_tenant_id ON biz_article (tenant_id);
CREATE INDEX idx_biz_article_column_id ON biz_article (column_id);
```

### 2.5 状态 / 枚举字段必须与代码约定一致

- `status` 为通用启停态时，对齐 `WithStatus` / `ObjectActiveStatus`
- 自定义业务枚举时，数据库通常落 `VARCHAR`，取值集合与 TypeScript `enum` 对象保持一致
- 不要在 DDL 里随手写一个自由字符串字段，然后让 Entity / DTO 各自再发明一套取值
- 若该枚举面向前端展示，通常还应在 `public/dict.json` 中维护同一组 code

```sql
status      VARCHAR(16)  NOT NULL DEFAULT 'active' COMMENT '状态（ObjectActiveStatus: active/disabled）',
source_type VARCHAR(16)  NOT NULL                  COMMENT '来源类型（KnowledgeBaseSourceType，对应 dict: knowledge_base_source_type）',
```

## 3. 模板

```sql
-- {功能描述}（{表名}）
CREATE TABLE `{table_name}` (
  `id`          VARCHAR(64)  NOT NULL                   COMMENT 'Snowflake ID',
  `tenant_id`   VARCHAR(64)  NOT NULL                   COMMENT '租户/医院 ID',
  -- 业务字段
  `name`        VARCHAR(128) NOT NULL                   COMMENT '名称',
  `status`      VARCHAR(16)  NOT NULL DEFAULT 'active'  COMMENT '状态（ObjectActiveStatus）',
  -- 公共字段（对齐 extendable）
  `created_at`  TIMESTAMPTZ  NOT NULL DEFAULT NOW()     COMMENT '创建时间',
  `updated_at`  TIMESTAMPTZ  NOT NULL DEFAULT NOW()     COMMENT '更新时间',
  `deleted_at`  TIMESTAMPTZ  NULL                       COMMENT '软删除时间',
  `created_by`  VARCHAR(64)  NULL                       COMMENT '创建人 ID',
  `updated_by`  VARCHAR(64)  NULL                       COMMENT '更新人 ID',
  PRIMARY KEY (`id`)
);

-- 索引
CREATE INDEX idx_{table_name}_tenant_id ON {table_name} (tenant_id);

-- 软删除表的唯一约束（必须加 WHERE deleted_at IS NULL）
CREATE UNIQUE INDEX uq_{table_name}_{key}
  ON {table_name} ({columns})
  WHERE deleted_at IS NULL;
```

## 相关 skill

- `write-feat-design` — 功能设计文档
- `design-database-entity` — TypeORM Entity 设计（SQL 与 Entity 保持一致）
- `entity-base` — extendable / `WithStatus` / `ObjectActiveStatus`
- `dict-json` — 业务枚举的字典项
