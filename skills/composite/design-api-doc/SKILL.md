---
name: design-api-doc
description: 接口文档放在工程 docs/api-schema/，按模块拆分；记录路径、方法、Query/Body 字段、返回 VO 结构、错误码、权限要求；接口结构调整后必须同步更新。
when_to_use: 关键词 — docs, api-schema, documentation, design
---


# 接口文档设计

## 1. 位置与组织

- 工程根 `docs/api-schema/` 下按业务模块分文件：`docs/api-schema/{module}.md`
- 通用约定写在 `docs/api-schema/README.md`（响应结构、错误码列表、鉴权头等）
- 工程级别的文档总规范遵循根目录 `docs/doc-guide.md`（若存在）

## 2. 单接口必备字段

| 字段 | 说明 |
| - | - |
| 路径 + 方法 | `GET /api/v1/user/page` |
| 鉴权要求 | 需要的身份（`@IdentityRequired`）与权限码（`@PermissionRequired`），或 `@Public` |
| Query / Path | 参数表：字段、类型、是否必填、说明、示例（Path 应不存在，全部 Query） |
| Body | DTO 字段表，标注校验规则（非空 / 范围 / 嵌套等） |
| 响应 | VO 结构表 + 完整 JSON 示例（包裹 `ApiResBody`） |
| 错误码 | 该接口可能抛出的 `BizError code` 列表 |

## 3. 字段约定

- 时间字段标注格式：`YYYY-MM-DD HH:mm:ss`（响应层 `DateSerializeInterceptor` 默认值）
- 分页字段统一：`page`、`pageSize`、`rows`、`total`
- 范围字段说明开区间用法：`createTimeRange=,2024-01-01` 表示 `<= 2024-01-01`

## 4. 同步要求

接口结构（路径 / 入参 / 出参）调整必须**同步更新文档**，否则视为未完成。文档 PR 可与代码 PR 合并提交。

## 5. 模板

```markdown
## GET /api/v1/user/page — 用户分页

- 鉴权：`@IdentityRequired('hospital_admin')` + `@PermissionRequired('user.view')`

### Query

| 字段 | 类型 | 必填 | 说明 |
| - | - | - | - |
| username | string | 否 | 模糊匹配 |
| createTimeRange | string | 否 | 时间范围，示例 `2024-01-01,2024-12-31` |
| page | number | 否 | 默认 1 |
| pageSize | number | 否 | 默认 10 |

### 响应

包裹 `ApiResBody<IPageData<UserListVO>>`：

\`\`\`json
{ "code": 200, "message": "请求完成",
  "data": { "rows": [{ "id": "1", "name": "Tom", "statusText": "启用" }],
    "total": 1, "page": 1, "pageSize": 10 } }
\`\`\`

### 错误码

| code | 含义 |
| - | - |
| 1001 | 手机号已存在 |
```

## 相关 skill

- `restful-style`、`pagination-and-list`、`response-apiresbody`、`biz-error`
