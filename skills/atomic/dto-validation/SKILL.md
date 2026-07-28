---
name: dto-validation
description: 用 class-validator/class-transformer 校验请求 DTO；时间字段必须 @ToDate，布尔字段用 parseBooleanGeneral，枚举字段用 @IsEnum(枚举对象)，非空字符串用 @EnsureNotBlank。
type: atomic
tags: [dto, validation]
when_to_use: 关键词 — dto, validation, class-validator, IsEnum, ObjectActiveStatus, class-transformer
---


# 请求 DTO 规范

工程已全局启用 `ValidationPipeWithTransform`，DTO 上的 `class-validator` 装饰器自动生效；不通过会由全局过滤器返回字段级错误。

## 关键约束

时间类型字段**必须 `@ToDate`**，否则会以字符串落入 TypeORM 的 `timestamptz` 字段导致写入异常。

## 常用装饰器

| 用途 | 装饰器 | 来源 |
| - | - | - |
| 字符串 → Date | `@ToDate()` | `@qyy-code-lego/nestjs/core/nest/transform/ToDate.decorator` |
| Query 字符串 → Boolean | `@Transform(parseBooleanGeneral)` | 同上目录 |
| 枚举 code 校验 | `@IsEnum(SomeEnum)` | class-validator |
| 非空字符串 + trim | `@EnsureNotBlank()` | 同上目录 |
| 嵌套对象校验 | `@IsObject() + @ValidateNested() + @Type(() => X)` | class-validator/transformer |

## 枚举字段规范

- DTO 中的业务枚举字段必须声明为 **枚举对象类型**
- 使用 `@IsEnum(枚举对象)` 校验
- 通用启停状态优先复用 `ObjectActiveStatus`
- 不要把 `status?: string`、`type?: 'a' | 'b'` 之类的松散写法暴露到 DTO

```typescript
import { IsEnum, IsOptional } from 'class-validator';
import { ObjectActiveStatus } from '@qyy-code-lego/nestjs/entities';

export enum KnowledgeBaseSourceType {
  MANUAL = 'manual',
  IMPORT = 'import',
}

export class UpdateKnowledgeBaseDTO {
  @IsOptional()
  @IsEnum(ObjectActiveStatus)
  status?: ObjectActiveStatus;

  @IsOptional()
  @IsEnum(KnowledgeBaseSourceType)
  sourceType?: KnowledgeBaseSourceType;
}
```

通常枚举 code 还应在 `public/dict.json` 中维护对应字典，前后端共享同一套 code。详见 `dict-json`。

## 完整示例

```typescript
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsObject, ValidateNested } from 'class-validator';
import { ToDate } from '@qyy-code-lego/nestjs/core/nest/transform/ToDate.decorator';
import { parseBooleanGeneral } from '@qyy-code-lego/nestjs/core/nest/transform';
import { EnsureNotBlank } from '@qyy-code-lego/nestjs/core/nest/transform/EnsureNotBlank.decorator';
import { ObjectActiveStatus } from '@qyy-code-lego/nestjs/entities';

class MetaData {
  @IsNotEmpty({ message: '字段 a 不能为空' })
  a: string;
}

export class CreateUserDTO {
  @IsNotEmpty()
  name: string;

  @IsEnum(ObjectActiveStatus)
  status: ObjectActiveStatus;

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
- `entity-base` — Entity 侧枚举 / extendable 约定
- `dict-json` — 枚举 code 对应字典
- `restful-style` — 修改类接口禁止在 DTO 携带 id
- `serialization-vo` — 响应侧的 VO 装饰器（@Exclude/@Expose）
