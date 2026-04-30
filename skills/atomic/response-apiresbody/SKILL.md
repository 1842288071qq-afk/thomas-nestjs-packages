---
name: response-apiresbody
description: API 响应统一为 ApiResBody 结构，由全局 CatchEverythingFilter 自动封装；Controller 只返回 data 部分，必要时用 ApiResBody.of 显式包裹。
type: atomic
tags: [response, apiresbody]
when_to_use: 关键词 — response, apiresbody, filter
---


# 统一响应体 (ApiResBody)

全局 `CatchEverythingFilter` 自动把所有响应（成功/异常）封装为：

```json
{
  "code": 200,
  "message": "请求完成",
  "data": { },
  "fullUrl": "/api/v1/user",
  "method": "GET"
}
```

## Controller 写法

```typescript
import { ApiResBody } from '@thomas/nestjs/core/ApiResBody';

@Get('detail')
async detail(@Query('id') id: string): Promise<ApiResBody<UserDetailVO>> {
  const data = await this.service.getDetail(id);
  return ApiResBody.of(data);
}
```

直接 `return data` 通常也会被过滤器封装，但**显式声明 `Promise<ApiResBody<T>>` 并用 `ApiResBody.of` 返回**有助于类型可读性与文档生成。

## 异常路径

抛出的 `BizError` / `HttpException` / `ValidationException` 由同一过滤器映射为对应 `code` 与 HTTP 状态。详见 `biz-error`。

## 相关 skill

- `biz-error` — 业务异常如何被统一封装
