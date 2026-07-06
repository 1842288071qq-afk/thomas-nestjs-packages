---
name: dict-json
description: 业务枚举字典优先按“一字典一文件”维护在 public/dict/<key>.json（分片形态，推荐），兼容历史聚合文件 public/dict.json；通过 DictionaryService.getList/translate 提供下拉项与 code->text/path 翻译，Service 或 vo-transform 统一消费。
type: atomic
tags: [dictionary, enum]
when_to_use: 关键词 — public/dict, dict 分片, dict.json, dictionary, DictionaryService, translate, 枚举字典, code text
---


# 业务字典（分片目录 / 聚合文件）

工程内的业务字典由 `DictionaryService` 启动时加载、校验并同步到 Redis。字典有两种存放形态：

| 形态 | 位置 | 说明 | 建议 |
| - | - | - | - |
| **分片目录** | `public/dict/<key>.json` | 每个文件一个字典，**文件名即字典 key** | ✅ **优先采用** |
| 聚合文件 | `public/dict.json` | 数组，一个文件承载所有字典 | 兼容历史，逐步迁移 |

两种来源会被同时加载并按 `key` 合并；**同一 key 时分片目录覆盖聚合文件**（并打印告警），便于从聚合文件平滑迁移到分片目录。

## 1. 何时需要维护字典

- 面向前端展示的业务枚举，通常都应维护对应字典
- 前端需要下拉项、树形选项、`code -> text` 翻译时，优先走字典
- 不要在 Controller / VO / 前端里各自手写一套中文文案映射

通用启停态若直接对外展示，也应有统一字典项；Entity / DTO 侧则优先复用 `ObjectActiveStatus`。

## 2. 分片目录（推荐）

在 `public/dict/` 下，**每个字典单独一个 JSON 文件**，文件名（去掉 `.json` 后缀）就是字典的 `key`，文件内容只描述该字典本身（无需再写 `key`）：

`public/dict/knowledge_base_source_type.json`

```json
{
  "name": "知识库来源类型",
  "items": [
    { "value": "manual", "text": "手工录入" },
    { "value": "import", "text": "导入" }
  ]
}
```

强制约定：

- **一个文件只允许承载一个字典**，文件内容为单个对象（不是数组）
- **文件名即字典 key**，新增字典 = 新增一个 `<key>.json` 文件，而不是往大文件里塞
- 文件内如写了 `key` 且与文件名不一致，会告警并以**文件名**为准
- `name` 可省略，缺省时回退为文件名

好处：AI 与人都只需读写单个小文件，避免 `dict.json` 无限膨胀、难以维护与检索。

## 3. 聚合文件（兼容历史）

`public/dict.json` 仍然有效，结构为字典分组数组：

```json
[
  {
    "key": "knowledge_base_source_type",
    "name": "知识库来源类型",
    "items": [
      { "value": "manual", "text": "手工录入" },
      { "value": "import", "text": "导入" }
    ]
  }
]
```

字段含义（两种形态共用 `items` 结构）：

| 字段 | 说明 |
| - | - |
| `key` | 字典分组标识，全局唯一（分片形态由文件名提供） |
| `name` | 字典分组名称 |
| `items[].value` | 存库 code |
| `items[].text` | 展示文案 |
| `items[].children` | 树结构 |
| `items[].ext` | 附加属性 |

**新增字典优先落到 `public/dict/<key>.json`**；已在 `dict.json` 中的字典按需迁移，无需一次性搬完。

## 4. 与业务枚举的关系

建议一组业务含义同时维护两部分：

1. TypeScript `enum` 对象：供 Entity / DTO / Service 使用
2. 字典（分片文件优先）：供下拉与展示翻译使用

```typescript
export enum KnowledgeBaseSourceType {
  MANUAL = 'manual',
  IMPORT = 'import',
}
```

要求：

- `enum` 的值与字典 `items[].value` 保持一致
- 不要只有字典没有 enum，也不要只有 enum 没有字典（面向前端时）
- `status` 为通用启停态时优先复用 `ObjectActiveStatus`

## 5. Service / VO 中的使用

字典存放形态（分片 / 聚合）对读取方**完全透明**，仍按 `key` 消费。

### 获取下拉项

```typescript
const items = await this.dictionaryService.getList('knowledge_base_source_type');
```

### 翻译 code

```typescript
const sourceTypeDict = await this.dictionaryService.translate(
  'knowledge_base_source_type',
  entity.sourceType,
);

return {
  entity,
  sourceTypeDict,
};
```

推荐做法：

- Service 返回“实体/DTO + 字典翻译结果”的聚合对象
- `vo-transform` 再用 `plainToInstance` 组装最终 VO
- 不要在 Controller 里临时硬编码 `code === 'manual' ? '手工录入' : ...`

## 6. 不要做

- 不要把新字典继续往 `public/dict.json` 里堆，优先落到 `public/dict/<key>.json`
- 不要在一个分片文件里塞多个字典，或让文件名与字典 key 不一致
- 不要把业务枚举写成随意字符串而不维护统一字典
- 不要让不同接口各自复制一份 `statusText` 映射表
- 不要修改字典后忘记同步 Entity / DTO 中的枚举对象

## 相关 skill

- `entity-base` — Entity 侧状态 / 枚举落库
- `dto-validation` — DTO 侧 `@IsEnum(...)`
- `serialization-vo` — `vo-transform` 中组装展示态
- `design-database-entity` — Entity 设计与枚举对齐
- `write-ddl` — DDL 注释 / 取值范围与字典一致
