---
name: app-bootstrap-main
description: 每个 app 的 main.ts 标准写法 — NestFactory.create + connectGlobalGuards + 读 PORT 监听 HTTP + MqModule.connectMicroservices + startAllMicroservices；启用 source-map-support。
type: atomic
tags: [main, bootstrap, NestFactory, microservices, source-map]
---

# App main.ts 规范

每个 `apps/{app}/src/main.ts` 必须按以下结构编写。**不要为单个 app 自创不同的 bootstrap 流程**。

## 标准模板

```typescript
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import 'source-map-support/register';
import { connectGlobalGuards } from '@thomas/nestjs/common';
import { MqModule } from '@thomas/nestjs/core/nest/mq/mq.module';
import { YyptModule } from './yypt.module';

async function bootstrap() {
  const logger = new Logger('Yypt'); // app 名首字大写
  const app = await NestFactory.create(YyptModule);

  // 注入全局 Guards：JwtAuthGuard + AccountDeserialize + IdentityRequired + Permission
  connectGlobalGuards(app);

  const port = process.env.PORT ?? 2500;
  await app.listen(port);
  logger.log(`App HTTP Server is running on: http://localhost:${port} ✅`);

  // 一键连接 MQ 微服务监听 (Kafka & RabbitMQ)，仅在 app 使用 MQ 时调用
  MqModule.connectMicroservices(app);

  // 启动所有微服务（与 HTTP 共存的混合应用模式）
  app
    .startAllMicroservices()
    .catch((err) => logger.error('Microservices start failed ⚠️', err))
    .finally(() => logger.log('Microservices start process completed ✅'));
}
void bootstrap();
```

## 要点

| 关键点 | 说明 |
| - | - |
| `'source-map-support/register'` | 必须在最早 import；webpack 打包后让错误栈定位回 ts 源码 |
| `connectGlobalGuards(app)` | **必须调用**，统一注入 JWT / 账号反序列化 / 身份 / 权限四个全局 Guard，顺序由该函数管理 |
| `process.env.PORT` | 端口从 env 读，提供默认值 |
| `MqModule.connectMicroservices(app)` | 仅在 app 使用 Kafka/RabbitMQ 时调用；不使用 MQ 的 app 可省略此段及 `startAllMicroservices` |
| `void bootstrap()` | 顶层 `void` 避免悬挂 Promise lint 报错 |

## 不要做

- 不要手动逐一 `app.useGlobalGuards(...)`，应统一走 `connectGlobalGuards`
- 不要在 `main.ts` 内写业务初始化逻辑（迁移、种子数据等），那应放在专用 CLI 或独立 bootstrap script
- 不要 `console.log`，使用 `Logger` 实例

## 相关 skill

- `app-module-composition` — Root Module 结构
- `env-config-conventions` — PORT 等环境变量规范
- `create-new-app` — 新建 app 全流程
