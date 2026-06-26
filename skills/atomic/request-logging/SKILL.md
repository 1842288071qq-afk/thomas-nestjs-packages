---
name: request-logging
description: HTTP 请求日志 RequestLogsModule — 访问日志(accessLogEnabled)与持久化(persistEnabled)两个独立开关；@IgnoreRequestLog 跳过、@CaptureRequestLogBody 采集 body、ignorePaths/skip 过滤。
type: atomic
tags: [logging, request, observability]
when_to_use: 关键词 — request log, access log, 请求日志, core_request_log, IgnoreRequestLog, CaptureRequestLogBody, persistEnabled, accessLogEnabled
---


# HTTP 请求日志 (RequestLogsModule)

公共能力 `libs/core/src/nest/request-logs/`，全局 `RequestLogsInterceptor` 记录每个 HTTP 请求。**两个通道相互独立、各自开关**：

| 通道 | 开关 / env | 行为 |
|------|-----------|------|
| 访问日志 | `accessLogEnabled` / `APP_REQUEST_LOGS_ACCESS_LOG_ENABLED` | Nest `Logger` 输出单行 access log（成功 log、失败 warn），落盘交给 `log-file` |
| 持久化 | `persistEnabled` / `APP_REQUEST_LOGS_PERSIST_ENABLED` | 写入 `core_request_log`（或经 Kafka 异步落库），用于审计/排障 |

任一开启拦截器才生效。默认均关。旧 env：`*_PRINT_TO_STDOUT`=访问日志、`*_ENABLED`=持久化。

## 接入（@Global）

```typescript
RequestLogsModule.forRoot({
  systemType: 'yypt',                                   // 必填
  accessLogEnabled: appConfig.requestLogs.accessLogEnabled,
  persistEnabled: appConfig.requestLogs.persistEnabled,
  // persistenceMode: 'kafka', kafkaTopic, includeHeaders,
  // maskedHeaders, maxBodyLength, ignorePaths, skip
});
```

`forRootAsync({ imports, inject, useFactory, enableKafkaConsumer })` 从 ConfigService 读取；`persistenceMode: 'kafka'` 时设 `enableKafkaConsumer: true`。无需在 Controller 连线（注册了全局 `APP_INTERCEPTOR`）。

## 按接口控制

- **`@IgnoreRequestLog()`** — 跳过该 Controller/方法的**全部**日志（access + 持久化）。用于埋点等高频无意义接口（track/events）。命中时 `start()` 返回 null。
- **`@CaptureRequestLogBody({ requestBody?, responseBody? })`** — 默认不采集 body；标注后采集对应 body。优先级：运行时(ThreadLocal `requestLogs`) > 装饰器 > 模块默认。
- **`ignorePaths`**（string 前缀 / RegExp）与 **`skip: (req)=>boolean`** — 按路径/运行时条件统一跳过。三者命中其一即跳过。

```typescript
@IgnoreRequestLog()
@Controller('track')
export class TrackController {}

@CaptureRequestLogBody({ requestBody: true, responseBody: false })
@Post('login') login() {}
```

## 注意

- 落库失败只 warn，**绝不阻断请求**；body/headers 超 `maxBodyLength`（默认 50000）截断。
- `maskedHeaders`（默认 authorization/cookie）只脱敏请求头；敏感 body 不要加 `@CaptureRequestLogBody`。
- `bizCode` 自动从响应/异常的 `code` 提取。

## 相关 skill

- `log-file` — 访问日志/控制台日志的文件落盘
- `context-threadlocal` — accountId/identityId/requestId 来源
- `app-module-composition` — 根 Module 接入位置

详见 `docs/development/request-log.md`。
