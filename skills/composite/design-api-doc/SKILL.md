---
name: design-api-doc
description: 在 docs/api-schema/{端}/{模块}/ 下写接口文档 — index.md 记录接口语义/Controller 来源/请求路径/DTO-VO 引用/错误码；types.ts 归集该模块所有 DTO/VO 类型定义。
when_to_use: 关键词 — docs, api-schema, 接口文档, documentation, design, types.ts
---


# 接口文档设计（api-schema）

## 1. 文件位置

```
docs/api-schema/
├── api-schema-guide.md        ← 规范（必读）
├── admin/
│   └── {module}/
│       ├── index.md           ← 接口文档
│       └── types.ts           ← DTO/VO 类型定义
└── client/
    └── {module}/
        ├── index.md
        └── types.ts
```

**必须在 monorepo 根目录的 `docs/api-schema/{端}/{模块}/` 下创建，不得放在 `server/docs/`。**

- `{端}` 对应 app 名：`admin`（admin-app）、`client`（client-app）
- `{模块}` 对应 Controller 的路由前缀（如 `knowledge-base`、`dept`）

## 2. index.md 必备内容

每个接口按如下结构描述：

```markdown
# admin 端 {模块} 模块接口文档

## 模块信息

- 端：`admin`
- 模块：`{module}`
- Controller：`server/apps/admin-app/src/modules/{module}/{module}.controller.ts`
- 模块类型定义：`docs/api-schema/admin/{module}/types.ts`

---

## 鉴权说明

...

## 通用错误码

| HTTP Status | 业务码 | 说明 |
| --- | --- | --- |

---

## {N}. {接口名称}

### 接口语义

（一句话说清楚这个接口做什么）

### Controller 来源

- 文件：`server/apps/admin-app/src/modules/{module}/{module}.controller.ts`
- 方法：`{ControllerClass}.{methodName}`

### 请求信息

- 方法：`GET / POST / PATCH / DELETE`
- 路径：`/{prefix}/{sub}`
- 请求 DTO：`docs/api-schema/admin/{module}/types.ts#{DtoName}`
- 响应 VO：`docs/api-schema/admin/{module}/types.ts#{VoName}`

### 错误码

| HTTP Status | 业务码 | 说明 |
| --- | --- | --- |
```

## 3. types.ts 规范

只表达接口契约，不含业务逻辑：

```typescript
// ===== Query DTOs =====
export interface {Module}PageQuery {
  keyword?: string;
  status?: '{status1}' | '{status2}';
  page: number;
  pageSize: number;
}

// ===== Request DTOs =====
export interface Create{Module}DTO {
  name: string;
}

// ===== Response VOs =====
export interface {Module}ListItemVO {
  id: string;
  name: string;
  createdAt: string; // YYYY-MM-DD HH:mm:ss
}

export type {Module}ListRes = ApiResBody<IPageData<{Module}ListItemVO>>;
```

## 4. 关键约定

| 约定 | 说明 |
| - | - |
| 禁止 path 参数 | ID 一律 `?id=` query |
| DELETE 无 body | 批量 id 用 `?ids=1,2,3` |
| 时间格式 | 响应中时间字段格式 `YYYY-MM-DD HH:mm:ss` |
| 分页默认值 | `page` 默认 1，`pageSize` 默认 20 |
| 同步要求 | 接口结构变更必须同步更新文档 |

## 相关 skill

- `write-feat-design` — 功能设计文档
- `restful-style`、`pagination-and-list`、`response-apiresbody`、`biz-error`
