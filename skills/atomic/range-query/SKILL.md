---
name: range-query
description: 范围查询 DTO 字段必须用 @ParseRange / @ParseDateTimeRange；声明为可选数组，开区间通过留空的逗号分隔字符串支持。Service 按数组元素是否存在拼 BETWEEN/>=/<=。
type: atomic
tags: [range, dto, query, between, ParseRange, ParseDateTimeRange]
---

# 范围查询规范

## DTO 侧

```typescript
import { ParseRange } from '@thomas/nestjs/core/nest/transform/ParseRange.decorator';
import { ParseDateTimeRange } from '@thomas/nestjs/core/nest/transform/ParseDateTimeRange.decorator';

export class QueryDTO {
  @IsOptional() @IsArray() @ParseDateTimeRange()
  createTimeRange?: (string | null)[];

  @IsOptional() @IsArray() @ParseRange()
  priceRange?: (number | null)[];
}
```

装饰器自动把 `,100` / `100,` 这类字符串解析为 `[null, 100]` / `[100, null]`，前端留空表示开区间。

## Service 侧

按数组元素存在性拼 SQL：

```typescript
if (createTimeRange?.length === 2) {
  const [start, end] = createTimeRange;
  if (start && end) qb.andWhere('e.createdAt BETWEEN :start AND :end', { start, end });
  else if (start)   qb.andWhere('e.createdAt >= :start', { start });
  else if (end)     qb.andWhere('e.createdAt <= :end',   { end });
}
```

## 相关 skill

- `dto-validation` — 普通字段校验
- `service-paradigm` — Service 查询分层
