---
name: dto-validation
description: 用 class-validator/class-transformer 校验请求 DTO；时间字段必须 @ToDate，布尔字段用 parseBooleanGeneral，非空字符串用 @EnsureNotBlank，嵌套对象用 @Type+@ValidateNested。
when_to_use: 关键词 — dto, validation, class-validator, class-transformer, ToDate, EnsureNotBlank
---


# 请求 DTO 规范

工程已全局启用 `ValidationPipeWithTransform`，DTO 上的 `class-validator` 装饰器自动生效；不通过会由全局过滤器返回字段级错误。

## 关键约束

时间类型字段**必须 `@ToDate`**，否则会以字符串落入 TypeORM 的 `timestamptz` 字段导致写入异常。

## 常用装饰器

| 用途 | 装饰器 | 来源 |
| - | - | - |
| 字符串 → Date | `@ToDate()` | `@thomas/nestjs/core/nest/transform/ToDate.decorator` |
| Query 字符串 → Boolean | `@Transform(parseBooleanGeneral)` | 同上目录 |
| 非空字符串 + trim | `@EnsureNotBlank()` | 同上目录 |
| 嵌套对象校验 | `@IsObject() + @ValidateNested() + @Type(() => X)` | class-validator/transformer |

## 完整示例

```typescript
import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsObject, ValidateNested } from 'class-validator';
import { ToDate } from '@thomas/nestjs/core/nest/transform/ToDate.decorator';
import { parseBooleanGeneral } from '@thomas/nestjs/core/nest/transform';
import { EnsureNotBlank } from '@thomas/nestjs/core/nest/transform/EnsureNotBlank.decorator';

class MetaData {
  @IsNotEmpty({ message: '字段 a 不能为空' })
  a: string;
}

export class CreateUserDTO {
  @IsNotEmpty()
  name: string;

  @ToDate()
  createdAt: Date;

  @Transform(parseBooleanGeneral)
  isActive: boolean;

  @IsObject()
  @ValidateNested()
  @Type(() => MetaData)
  metaData: MetaData;

  @EnsureNotBlank({ message: '字段 description 不能为空' })
  description: string;
}
```

## 相关 skill

- `range-query` — 范围参数（时间/数值区间）专用装饰器
- `restful-style` — 修改类接口禁止在 DTO 携带 id
- `serialization-vo` — 响应侧的 VO 装饰器（@Exclude/@Expose）
