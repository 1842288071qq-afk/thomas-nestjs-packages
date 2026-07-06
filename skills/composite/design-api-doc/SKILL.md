---
name: design-api-doc
description: 在 docs/api-schema/{端}/{module}.md 写单文件接口文档 — 模块信息（Controller/DTO/VO 工程位置）+ 内联 TS 类型代码块 + 按接口名组织各接口的请求/响应/错误码，一文件读懂。
type: composite
tags: [api, docs]
when_to_use: 关键词 — docs, api-schema, 接口文档, documentation, design, {module}.md, 类型定义
---


# 接口文档设计（api-schema）

## 1. 文件位置与命名

```
docs/api-schema/
├── api-schema-guide.md        ← 规范（必读）
├── admin/
│   └── {module}.md            ← 接口文档（单文件，文件名 = 模块英文名）
└── client/
    └── {module}.md
```

**必须在 monorepo 根目录的 `docs/api-schema/{端}/{module}.md` 下创建，不得放在 `server/docs/`。**

- `{端}` 对应 app 名：`admin`（admin-api）、`client`（client-api）
- `{模块}` 对应 Controller 的路由前缀（如 `knowledge-base`、`dept`、`team`）
- **文件名直接使用模块英文名**（`{module}.md`），不再使用 `index.md`
- **不再生成 `types.ts`**：TS 类型作为代码块内联在 `{module}.md` 的 `## 类型定义` 小节
- 一个模块 = 一个 `.md` 文件自包含，便于 AI 与人一次读懂

## 2. {module}.md 必备结构

文档内小节顺序跟随 Controller 的接口（方法）名，整体模板：

````markdown
# {端} 端 {module} 模块接口文档

## 模块信息

- 端：`{端}`
- 模块：`{module}`（路由前缀 `/{prefix}`）
- Controller：`server/apps/{端}-api/src/modules/{module}/{module}.controller.ts`（`{ControllerClass}`）
- DTO：`server/apps/{端}-api/src/modules/{module}/dto/{xxx}.dto.ts`
- VO：`server/apps/{端}-api/src/modules/{module}/vo/{xxx}.types.ts`
- Service：`server/libs/business/src/{module}/xxx.service.ts`（`{ServiceClass}`）

（一句话模块语义说明）

---

## 鉴权说明

（@Public / @IdentityRequired、权限码）

## 通用错误码

| HTTP Status | 业务码 | 说明 |
| --- | --- | --- |

---

## 类型定义

> 仅契约，权威源为上方 Controller / DTO / VO 文件。`ApiResBody<T>` / `IPageData<T>` 见 [api-schema-guide.md](../api-schema-guide.md) 通用约定。

```ts
type SomeStatus = 'a' | 'b';

// ===== Query DTOs =====
export interface {Module}QueryDTO { ... }

// ===== Request DTOs =====
export interface Create{Module}DTO { ... }

// ===== Response VOs =====
export interface {Module}RowVO { ... }

export type {Module}PageRes = ApiResBody<IPageData<{Module}RowVO>>;
```

---

## {N}. {接口名称}

### 接口语义

（一句话说清楚这个接口做什么）

### Controller 与 DTO 来源

- Controller：`server/apps/{端}-api/src/modules/{module}/{module}.controller.ts` → `{ControllerClass}.{methodName}`
- DTO：`server/apps/{端}-api/src/modules/{module}/dto/{xxx}.dto.ts`

### 请求信息

- 方法：`GET / POST / PATCH / DELETE`
- 路径：`/{prefix}/{sub}`
- 请求参数 / 请求 DTO：`{DtoName}` — 见 [类型定义](#类型定义)
- 响应 VO：`{VoName}` — 见 [类型定义](#类型定义)
- 权限码：`xxx:yyy`

### 错误码

| HTTP Status | 业务码 | 说明 |
| --- | --- | --- |
````

## 3. 关键约定

| 约定 | 说明 |
| - | - |
| 单文件 | 一个模块一个 `{module}.md`，不拆 `index.md` / `types.ts` |
| 类型内联 | DTO/VO 全部放在 `## 类型定义` 的 ```ts 代码块内，不另建 `.ts` 文件 |
| 文档内引用 | 请求参数 / 响应 VO 直接引用本文档 `## 类型定义` 内的类型名（`见 [类型定义](#类型定义)`），不再指向外部 `types.ts` |
| Controller 与 DTO 来源 | 每个接口块写明 Controller 文件 + 类.方法、DTO 文件在工程中的位置（VO/Service 在模块信息中统一列出） |
| 禁止 path 参数 | ID 一律 `?id=` query |
| DELETE 无 body | 批量 id 用 `?ids=1,2,3` |
| 时间格式 | 响应中时间字段为 ISO 8601 字符串（实体未统一 `@Transform`） |
| 分页默认值 | `page` 默认 1，`pageSize` 默认 10（`PaginationDTO`） |
| 同步要求 | 接口结构变更必须同步更新文档与 `## 类型定义` |
| 不重复声明 | `ApiResBody<T>` / `IPageData<T>` 不在每篇文档重复声明，引用 `api-schema-guide.md` 通用约定即可 |

## 4. 不要做

- 不要再生成 `index.md` + `types.ts` 两文件形态，统一 `{module}.md` 单文件
- 不要把 TS 类型写到独立的 `.ts` 文件再被文档引用，必须内联为代码块
- 不要在文档间互相引用类型定义，每个模块文档自包含
- 不要让接口块的「请求参数 / 响应 VO」指向外部文件，统一引用本文档 `## 类型定义`
- 不要省略「Controller 与 DTO 来源」中的 DTO 工程路径

## 相关 skill

- `write-feat-design` — 功能设计文档
- `restful-style`、`pagination-and-list`、`response-apiresbody`、`biz-error`
