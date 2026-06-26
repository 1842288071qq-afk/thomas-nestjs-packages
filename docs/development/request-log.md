# HTTP 请求日志（RequestLogsModule）

> 公共能力，位于 `libs/core/src/nest/request-logs/`，通过 `RequestLogsModule.forRoot()` / `forRootAsync()` 接入。
> 通过全局 `RequestLogsInterceptor` 记录每个 HTTP 请求，**两个通道相互独立、各自可开关**：访问日志（Nest Logger 输出）与持久化（数据库 / Kafka 落库）。

## 1. 背景与目标

需要对线上 HTTP 流量做可观测：既要能在控制台/日志文件看到访问记录（access log），也要能把请求明细落库用于审计与排障。两者诉求不同（前者轻量高频、后者结构化可查），因此**拆成两个独立开关**，并提供按接口粒度的关闭与采集控制，避免埋点等高频接口产生无意义记录。

## 2. 两个通道（独立开关）

| 通道 | 开关 | 行为 |
|------|------|------|
| 访问日志 `accessLogEnabled` | `APP_REQUEST_LOGS_ACCESS_LOG_ENABLED` | 通过 Nest `Logger` 输出单行访问日志：`ip "METHOD path" status costMs success=… bizCode=… requestId=… ua=…`。成功 `logger.log`，失败 `logger.warn`。配合 `log-file` 可落盘 |
| 持久化 `persistEnabled` | `APP_REQUEST_LOGS_PERSIST_ENABLED` | 把请求明细写入 `core_request_log` 表（或经 Kafka 异步落库），用于审计/排障 |

二者任一开启时拦截器才生效（`isHttpEnabled`）。可只开访问日志、只开持久化，或都开。

## 3. 配置

### 3.1 env（驱动 AppConfig.requestLogs）

由 `resolveAppRequestLogsConfig`（`libs/common/src/config/app.config.ts`）解析进 `AppConfig.requestLogs`：

```
APP_REQUEST_LOGS_ACCESS_LOG_ENABLED=false   # 访问日志开关，默认 false
APP_REQUEST_LOGS_PERSIST_ENABLED=false      # 持久化开关，默认 false
```

> 兼容旧变量：`APP_REQUEST_LOGS_PRINT_TO_STDOUT` 等价于 `*_ACCESS_LOG_ENABLED`；`APP_REQUEST_LOGS_ENABLED` 等价于 `*_PERSIST_ENABLED`。新代码用新变量。

### 3.2 模块 Options

接入时把 env 配置喂给 `RequestLogsModule`。完整 Options（`RequestLogsModuleOptions`）：

| 字段 | 默认 | 说明 |
|------|------|------|
| `systemType` | （必填） | 系统标识（`ykl`/`khy`/`yypt` 等），写入每条日志 |
| `accessLogEnabled` | `false` | 访问日志开关（旧名 `printToStdout`） |
| `persistEnabled` | `false` | 持久化开关（旧名 `enabled`） |
| `persistenceMode` | `database` | `database` 直接落库；`kafka` 经 Kafka 异步落库 |
| `kafkaTopic` | `core.request-log` | kafka 模式的 topic |
| `includeHeaders` | `true` | 是否记录请求头 |
| `captureRequestBodyByDefault` | `false` | 是否默认采集请求体 |
| `captureResponseBodyByDefault` | `false` | 是否默认采集响应体 |
| `maxBodyLength` | `50000` | body/headers 序列化后超长则截断为 `{__truncated__, preview, originalLength}` |
| `maskedHeaders` | `['authorization','cookie']` | 脱敏请求头（值替换为 `***`） |
| `ignorePaths` | `[]` | 路径前缀（string，`startsWith`）或正则（RegExp）命中即跳过 |
| `skip` | — | `(req) => boolean`，返回 true 跳过（最灵活） |

## 4. 接入方式

同步：

```typescript
RequestLogsModule.forRoot({
  systemType: 'yypt',
  accessLogEnabled: appConfig.requestLogs.accessLogEnabled,
  persistEnabled: appConfig.requestLogs.persistEnabled,
});
```

异步（从 ConfigService 读取，kafka 模式需开消费者）：

```typescript
RequestLogsModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  enableKafkaConsumer: true, // persistenceMode=kafka 时由独立消费者落库
  useFactory: (config: ConfigService<AllConfig>) => {
    const rl = config.get<AppConfig>('app')!.requestLogs;
    return {
      systemType: 'yypt',
      accessLogEnabled: rl.accessLogEnabled,
      persistEnabled: rl.persistEnabled,
      persistenceMode: 'kafka',
    };
  },
});
```

模块为 `@Global()`，注册全局 `APP_INTERCEPTOR`，无需在 Controller 手动连线。

## 5. 按接口控制

### 5.1 跳过日志 `@IgnoreRequestLog()`

埋点等高频、记录无意义的接口（`track/event`、`track/events`），用 `@IgnoreRequestLog()` 跳过——access log 与持久化**双双不记录**。可加在 `@Controller` 类（覆盖全部路由）或单个路由方法上。命中时 `RequestLogsService.start` 直接返回 `null`。

```typescript
import { IgnoreRequestLog } from '@thomas/nestjs/core/nest/request-logs';

@IgnoreRequestLog()
@Controller('track')
export class TrackController {
  @Post('events')
  collect() { /* 不产生任何请求日志 */ }
}
```

与 `ignorePaths` / `skip` 的关系：三者命中其一即跳过。`@IgnoreRequestLog` 适合「按代码归属」的固定接口；`ignorePaths`/`skip` 适合「按路径/运行时条件」的统一规则。

### 5.2 采集 body `@CaptureRequestLogBody()`

默认不采集 body（避免体积与隐私）。需要对某接口采集请求/响应体时：

```typescript
import { CaptureRequestLogBody } from '@thomas/nestjs/core/nest/request-logs';

@CaptureRequestLogBody() // 默认 requestBody+responseBody 都采集
@Post('order')
createOrder() {}

@CaptureRequestLogBody({ requestBody: true, responseBody: false })
@Post('login')
login() {}
```

采集开关优先级：**运行时（ThreadLocal `requestLogs`）> 装饰器 > 模块默认**（`captureRequestBodyByDefault` / `captureResponseBodyByDefault`）。

## 6. 落库内容

`core_request_log` 记录：systemType、accountId/identityId、requestId、method、fullPath/path、query/params、（可选）requestBody/responseBody、（可选）headers（脱敏后）、ip、userAgent、costMs、httpStatus、bizCode、success、errorMessage。

- `bizCode` 自动从响应体/异常的 `code`（或 `response.code`）提取。
- body/headers 经 `toJsonLike` 规整（Date→ISO、Buffer→摘要、最大深度 6），超 `maxBodyLength` 截断。
- 落库失败只 `logger.warn`，**绝不阻断请求**。

## 7. 边界与已知限制

- 访问日志走 Nest `Logger`，其落盘交由 [log-file](./log-file.md) 能力，本模块不直接写文件。
- kafka 模式下，发布失败会自动降级为直接落库；`enableKafkaConsumer` 仅在 `persistenceMode=kafka` 时需要。
- `maskedHeaders` 只脱敏请求头；若 body 含敏感字段，应在接口层避免采集（不要对其加 `@CaptureRequestLogBody`）。
