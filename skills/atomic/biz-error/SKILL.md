---
name: biz-error
description: 业务预期错误（余额不足、状态不合法等）必须抛 BizError，可链式 codeAs/httpStatusAs 自定义业务码与 HTTP 状态。
type: atomic
tags: [error, business]
when_to_use: 关键词 — error, exception, bizerror
---


# 业务异常 (BizError)

业务预期错误（非系统级）一律抛 `BizError`，由全局过滤器映射为标准响应。**禁止直接 throw new Error 或 HttpException 表达业务异常。**

```typescript
import { BizError } from '@libs/core/BizError';

if (balance < amount) {
  throw new BizError('余额不足')
    .codeAs(1001)        // 业务码
    .httpStatusAs(402);  // HTTP 状态码（默认 400）
}
```

## 默认值

- `httpStatus` 默认 400
- `code` 默认 400
- `message` 用于面向用户提示，应清晰可读

## 使用建议

- 链式调用一行内表达，避免拆分
- 业务码 `code` 在团队内做枚举管理（可参考 `BizCode.ts`）
- 在 Service 层校验业务前置条件时第一时间抛错，避免半途状态

## 相关 skill

- `response-apiresbody` — BizError 如何被封装
- `service-paradigm` — Service 层做业务校验
