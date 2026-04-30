---
name: config-service
description: 通过 NestJS 原生 ConfigService<AllConfig> 读取配置；说明内置 config、AppConfig、点路径读取、registerAs 扩展命名空间与约定大于配置。
type: atomic
tags: [config, registerAs]
when_to_use: 关键词 — config, AllConfig, AppConfig, registerAs, configModuleImport, yaml, env
---


# 配置体系与读取

工程统一使用 NestJS 原生 `ConfigService` + `registerAs` + `configModuleImport` 管理配置，禁止自造配置加载器。

## 1. 全局类型 `AllConfig`

`@thomas/nestjs/common/config/config.interface.ts` 通过 `declare global` 定义 `AllConfig`，作为所有命名空间的总索引：

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

业务代码优先注入 `ConfigService<AllConfig>`：

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private readonly config: ConfigService<AllConfig>) {}

  init() {
    const app = this.config.get<AppConfig>('app')!;
    const datasource =
      this.config.get<Record<string, DataSourceConfig>>('datasource')!;
    const dbHost = datasource.default.host;
    const port = app.port;
    const jwtWhite = this.config.get<string[]>('jwt.whiteList', []);
  }
}
```

## 2. 内置命名空间

以下命名空间由 `configModuleImport` 自动加载，无需手工重复注册：

| 命名空间 | 说明 |
| - | - |
| `app` | `port` / `host` / `name` / `apiPrefix` / `logger` |
| `session` | 会话与踢出策略 |
| `datasource` | 一个或多个 TypeORM 数据源 |
| `file` | 本地文件存储配置 |
| `questionBank` | 题库等业务内置配置 |

## 3. 约定大于配置

- env 变量按模块前缀组织，见 `env-config-conventions`
- 配置工厂统一放在 `apps/{app}/src/config/*.config.ts`
- Root Module 用 `configModuleImport({ envName, configs })` 一次性装配
- 业务代码不要直接散落 `process.env.X`

## 4. 扩展自定义命名空间

### 步骤 1：扩展 `AllConfig`

```typescript
declare global {
  interface AllConfig {
    mq: MqConfig;
    business: BusinessConfig;
  }
}
```

### 步骤 2：用 `registerAs` 注册

```typescript
import { registerAs } from '@nestjs/config';

export const mqConfig = registerAs('mq', () => ({
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'myapp-kafka',
    brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
  },
}));
```

### 步骤 3：传给 `configModuleImport`

```typescript
configModuleImport({
  envName: 'myapp',
  configs: [datasourceConfig, mqConfig],
})
```

## 5. 读取约定

- 使用点路径读取嵌套字段
- 建议为可选值提供默认值，避免 `undefined` 流入业务逻辑
- 读取整个命名空间时优先 `config.get<SomeConfig>('someKey')`
- `main.ts` / Module / Service 全部走同一套 `ConfigService<AllConfig>`

## 6. 不要做

- 不要在业务代码里直接 `process.env.X`
- 不要写一个只在局部生效的私有配置读取 helper
- 不要覆盖 `AllConfig`，只做 declaration merging 扩展
- 不要在 `registerAs` 工厂里做异步或依赖注入

## 相关 skill

- `config-namespaces` — 兼容入口；详细内容并入本 skill
- `app-module-composition` — `configModuleImport` 的组装位置
- `app-bootstrap-main` — main.ts 中读取 `AppConfig`
- `env-config-conventions` — env 命名与配置来源
