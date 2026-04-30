---
name: config-namespaces
description: 配置通过 declare global 的 AllConfig 接口定义命名空间类型；内置 app/session/datasource/file/questionBank；扩展时 declare 同名 interface 合并；使用 ConfigService<AllConfig> 获得类型安全访问。
type: atomic
tags: [config, AllConfig, AppConfig, namespace, registerAs, declare-global]
---

# Config 命名空间与类型体系

## 1. 全局类型 `AllConfig`

`@thomas/nestjs/common/config/config.interface.ts` 通过 `declare global` 定义了 `AllConfig` 接口，作为所有配置命名空间的类型索引：

```typescript
declare global {
  interface AllConfig {
    app: AppConfig;
    session: SessionConfig;
    datasource: Record<string, DataSourceConfig>;
    questionBank: QuestionBankConfig;
    file: FileConfig;
  }
}
```

使用 `ConfigService<AllConfig>` 注入后，`get` 方法获得完整类型安全：

```typescript
const config = app.get(ConfigService<AllConfig>);
const appConfig = config.get<AppConfig>('app')!;
// appConfig.port / .host / .name / .apiPrefix / .logger 均有类型
```

## 2. 内置命名空间

以下命名空间由 `configModuleImport` 自动加载，无需手动在 imports 中注册：

| 命名空间 | 接口 | 说明 |
| - | - | - |
| `app` | `AppConfig` | `port` / `host` / `name` / `devName` / `apiPrefix` / `logger` (含 `levels` 与 `context`) |
| `session` | `SessionConfig` | `maxTime` / `debounceTime` / `kickOutEnable` |
| `file` | `FileConfig` | `local.storageRoot` / `local.serveRoot` |
| `datasource` | `Record<string, DataSourceConfig>` | 数据源集合，key 为数据源名（`default`、`audit` 等） |
| `questionBank` | `QuestionBankConfig` | `baseUrl` / `defaultAgentId` / `sessionKey` |

内置命名空间通过 `libs/common/src/config/` 下各自的 `*.config.ts` 配合 `registerAs` 注册，在 `configModuleImport` 内统一 `load`。

## 3. AppConfig 详解

`app` 是最常用的命名空间，字段来源：

| 字段 | 环境变量 | 说明 |
| - | - | - |
| `port` | `PORT` | HTTP 端口，默认 3000 |
| `name` | `APP_NAME` | 应用名称 |
| `devName` | `DEV_NAME` | 开发机器名，默认 `os.hostname()` |
| `apiPrefix` | `API_PREFIX` | URL 前缀（如 `api/v1`），为空时不设 |
| `host` | `HOST` | 监听地址，不配置时走 Nest 默认（所有接口） |
| `logger.levels` | `APP_LOG_LEVEL` | Nest 日志级别列表，默认 `info` |
| `logger.context` | `APP_LOGGER_CONTEXT` | 启动日志上下文，默认取 `APP_NAME` |

## 4. 扩展自定义命名空间

每个 app 可通过 `declare global` 声明同名 `AllConfig` interface（TS 会自动合并），然后通过 `registerAs` 注册到 `configModuleImport` 的 `configs` 参数：

**步骤 1：定义类型**

在 `apps/{app}/src/config/` 下声明扩展：

```typescript
// 与 config.interface.ts 中已有的 AllConfig 合并
declare global {
  interface AllConfig {
    // 新增自定义命名空间
    mq: MqConfig;
    business: BusinessConfig;
  }
}

export interface MqConfig {
  kafka: { clientId: string; brokers: string[]; groupId: string; consumer: {...} };
  rabbit: { urls: string[]; queue: string };
}
```

**步骤 2：registerAs 注册值**

```typescript
// mq.config.ts
import { registerAs } from '@nestjs/config';

export const mqConfig = registerAs('mq', () => ({
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'myapp-kafka',
    brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
    // ...
  },
  rabbit: {
    urls: (process.env.RABBIT_URLS || 'amqp://localhost:5672').split(','),
    queue: process.env.RABBIT_QUEUE || 'myapp-queue',
  },
}));
```

**步骤 3：传入 configModuleImport**

```typescript
// {app}.module.ts
configModuleImport({
  configs: [datasourceConfig, mqConfig], // 自定义 configs 在此传入
  envName: 'myapp',
})
```

## 5. 读取方式

在任意注入点使用类型化 ConfigService：

```typescript
@Injectable()
export class MyService {
  constructor(private readonly config: ConfigService<AllConfig>) {}

  init() {
    const mq = this.config.get<MqConfig>('mq')!;
    const ds = this.config.get<Record<string, DataSourceConfig>>('datasource')!;
    const defaultDs = ds.default;
  }
}
```

## 6. 不要做

- 不要在业务代码里直接 `process.env.X` 取值，统一通过 `ConfigService` + `registerAs` 收敛
- 不要在 `registerAs` 回调内注入其他服务或做异步操作，它必须是同步的工厂函数
- 扩展 `AllConfig` 时声明新的 `interface AllConfig` 即可（TS declaration merging），不要覆盖已有命名空间

## 相关 skill

- `config-service` — 基础 ConfigService.get 用法
- `app-module-composition` — configModuleImport 的组装位置
- `app-bootstrap-main` — main.ts 中获取 AppConfig
- `env-config-conventions` — env 变量命名与加载
