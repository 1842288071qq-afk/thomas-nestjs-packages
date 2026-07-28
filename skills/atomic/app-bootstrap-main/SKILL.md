---
name: app-bootstrap-main
description: app 的 main.ts 推荐写法 — 从 AppConfig 取 port/host/apiPrefix/logger 启动 HTTP，connectGlobalGuards 注入全局守卫，apiPrefix 可选。
type: atomic
tags: [bootstrap, main]
when_to_use: 关键词 — main, bootstrap, NestFactory, AppConfig, apiPrefix, logger
---


# App main.ts 规范

推荐按以下模式编写 `apps/{app}/src/main.ts`。核心思路：启动参数统一从 `AppConfig` 取得，避免散落 `process.env`。

## 推荐模板

```typescript
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { connectGlobalGuards } from '@qyy-code-lego/nestjs/common';
import type { AppConfig } from '@qyy-code-lego/nestjs/common/config/config.interface';
// 如需使用 Kafka / RabbitMQ，取消下一行 import 注释
// import { MqModule } from '@qyy-code-lego/nestjs/core/nest/mq/mq.module';
import { AdminAppModule } from './admin-app.module';

async function bootstrap() {
  const app = await NestFactory.create(AdminAppModule);
  const config = app.get(ConfigService<AllConfig>);
  const appConfig = config.get<AppConfig>('app')!;

  // 日志级别由配置控制
  app.useLogger(appConfig.logger.levels);

  // 注入全局 Guards（JWT / 账号反序列化 / 身份 / 权限），顺序由该函数管理
  connectGlobalGuards(app);

  // 可选：注入业务工程特有的全局守卫
  // connectYJGlobalGuards(app);

  const logger = new Logger(appConfig.logger.context);
  const port = appConfig.port;
  const host = appConfig.host;
  const apiPrefix = appConfig.apiPrefix;
  const appName = appConfig.name;
  const basePath = apiPrefix ? `/${apiPrefix}` : '/api';
  const displayHost = host || 'localhost';

  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }

  if (host) {
    await app.listen(port, host);
  } else {
    await app.listen(port);
  }
  logger.log(
    `${appName} HTTP Server is running on: http://${displayHost}:${port}${basePath} ✅`,
  );

  // 如需使用 Kafka / RabbitMQ，取消以下注释。同时需要在 Root Module 引入 mqConfig
  // // 一键连接 MQ 微服务监听
  // MqModule.connectMicroservices(app);
  // // 启动所有微服务（与 HTTP 共存的混合应用模式）
  // app
  //   .startAllMicroservices()
  //   .catch((err) => logger.error('Microservices start failed ⚠️', err))
  //   .finally(() => logger.log('Microservices start process completed ✅'));
}
void bootstrap();
```

## 要点

| 关键点 | 说明 |
| - | - |
| `ConfigService<AllConfig>` | 从 `app.get()` 拿到类型化 ConfigService，后续 `get` 有类型提示。详见 `config-service` |
| `AppConfig` | 内置 `app` 命名空间，提供 `port` / `host` / `name` / `apiPrefix` / `logger`（含 `levels` 与 `context`）。由 `configModuleImport` 自动加载 |
| `app.useLogger(...)` | 用 `AppConfig.logger.levels` 控制 Nest 日志输出级别，替代 `app.useLogger(false)` 的粗暴关闭 |
| `setupAppLogger(app, appConfig)` | 需要日志文件落盘时用它替代 `app.useLogger(...)`（默认关闭，零侵入），见 `log-file` |
| `app.setGlobalPrefix(apiPrefix)` | 统一 URL 前缀，如 `api/v1`；接入 `HealthModule` 时用 `{ exclude: ['health','health/ready'] }` 排除健康路径，见 `health-check` |
| `connectGlobalGuards(app)` | 统一注入全局 Guard 链，不在 `main.ts` 逐个调 `useGlobalGuards` |
| `void bootstrap()` | 顶层 `void` 避免悬挂 Promise |

## 不要做

- 不要在 `main.ts` 直接 `process.env.X` 散落各处，启动参数统一走 `AppConfig`
- 不要手动逐一 `app.useGlobalGuards(...)`，走 `connectGlobalGuards`
- 不要在 `main.ts` 内写业务初始化逻辑（迁移、种子数据等），那应放在专用 CLI 或独立 bootstrap script
- 不要 `console.log`，使用 `Logger` 实例

## 相关 skill

- `config-service` — `AllConfig` / `AppConfig` 类型体系与扩展方式
- `app-module-composition` — Root Module 结构
- `env-config-conventions` — env 变量如何映射到 config
- `create-new-app` — 新建 app 全流程
- `log-file` — `setupAppLogger` 日志文件落盘
- `health-check` — `/health` 路径与全局前缀排除
