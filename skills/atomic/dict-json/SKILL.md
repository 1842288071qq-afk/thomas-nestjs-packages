---
name: dict-json
description: 业务枚举通常同步维护 public/dict.json；通过 DictionaryService.getList/translate 提供下拉项与 code->text/path 翻译，Service 或 vo-transform 统一消费。
type: atomic
tags: [dictionary, enum]
when_to_use: 关键词 — dict.json, dictionary, DictionaryService, translate, 枚举字典, code text
---


# `dict.json` 与业务字典

工程内的业务字典文件默认放在 **`public/dict.json`**，`DictionaryService` 启动时会读取、校验并同步到 Redis。

## 1. 何时需要维护字典

- 面向前端展示的业务枚举，通常都应维护对应字典
- 前端需要下拉项、树形选项、`code -> text` 翻译时，优先走字典
- 不要在 Controller / VO / 前端里各自手写一套中文文案映射

通用启停态若直接对外展示，也应有统一字典项；Entity / DTO 侧则优先复用 `ObjectActiveStatus`。

## 2. 文件结构

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

字段含义：

| 字段 | 说明 |
| - | - |
| `key` | 字典分组标识，全局唯一 |
| `name` | 字典分组名称 |
| `items[].value` | 存库 code |
| `items[].text` | 展示文案 |
| `items[].children` | 树结构 |
| `items[].ext` | 附加属性 |

## 3. 与业务枚举的关系

建议一组业务含义同时维护两部分：

1. TypeScript `enum` 对象：供 Entity / DTO / Service 使用
2. `public/dict.json`：供下拉与展示翻译使用

```typescript
export enum KnowledgeBaseSourceType {
  MANUAL = 'manual',
  IMPORT = 'import',
}
```

要求：

- `enum` 的值与 `dict.json.items[].value` 保持一致
- 不要只有 dict 没有 enum，也不要只有 enum 没有 dict（面向前端时）
- `status` 为通用启停态时优先复用 `ObjectActiveStatus`

## 4. Service / VO 中的使用

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

## 5. 不要做

- 不要把业务枚举写成随意字符串而不维护统一字典
- 不要让不同接口各自复制一份 `statusText` 映射表
- 不要修改 `dict.json` 后忘记同步 Entity / DTO 中的枚举对象

## 相关 skill

- `entity-base` — Entity 侧状态 / 枚举落库
- `dto-validation` — DTO 侧 `@IsEnum(...)`
- `serialization-vo` — `vo-transform` 中组装展示态
- `design-database-entity` — Entity 设计与枚举对齐
- `write-ddl` — DDL 注释 / 取值范围与字典一致
