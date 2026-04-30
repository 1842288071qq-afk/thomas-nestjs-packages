---
name: create-new-app
description: 在 monorepo 内新增一个 app 的全流程 — 注册 nest-cli.json、建 tsconfig.app.json、创建 main.ts/根 Module/config/datasource.config.ts/mq.config.ts、env/{appName}.env(.example)、PORT 与 REDIS_KEY_PREFIX 命名空间。
type: composite
tags: [new-app, monorepo, scaffold, bootstrap, nest-cli]
---

# 新建 App 全流程

新建一个 `apps/{appName}` 的标准步骤。下面以 `myapp` 为例。

## 1. 注册到 `nest-cli.json`

在根 `nest-cli.json` 的 `projects` 加：

```json
"myapp": {
  "type": "application",
  "root": "apps/myapp",
  "entryFile": "main",
  "sourceRoot": "apps/myapp/src",
  "compilerOptions": { "tsConfigPath": "apps/myapp/tsconfig.app.json" }
}
```

如果该 app 是当前默认（用 `nest start`/`nest build` 不带 project 名），同步把根级别的 `sourceRoot` / `root` / `compilerOptions.tsConfigPath` 指过去；否则保持原默认。

## 2. tsconfig

`apps/myapp/tsconfig.app.json`：

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "outDir": "../../dist/apps/myapp"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

## 3. env 文件（参见 `env-config-conventions`）

新建工程根 `env/myapp.env` 与 `env/myapp.env.example`：

```dotenv
# 应用
PORT=2600                          # 给每个 app 分配独立端口
APP_NAME=nestjs-myapp
APP_LOG_LEVEL=info

# 数据库
DATABASE_HOST=172.10.10.10
DATABASE_PORT=15432
DATABASE_USER=nestjs_boilerplate
DATABASE_PASSWORD=nestjs_boilerplate
DATABASE_NAME=nestjs_myapp

# JWT
JWT_SECRET=replace-me

# Redis（必须独立 prefix）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_KEY_PREFIX=nestjs-myapp:
# REDIS_PASSWORD=

# Kafka / Rabbit（按需，不用可删）
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=myapp-kafka
KAFKA_GROUP_ID=myapp-group
RABBIT_URLS=amqp://localhost:5672
RABBIT_QUEUE=myapp-queue
```

确保 `gitignore` 已忽略 `env/*.local`。

## 4. config 模块文件

`apps/myapp/src/config/datasource.config.ts`（按需多数据源）：

```typescript
import { registerAs } from '@nestjs/config';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies/snake-naming.strategy';

export const datasourceConfig = registerAs('datasource', () => ({
  default: {
    type: 'postgres' as const,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'postgres',
    autoLoadEntities: true,
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    namingStrategy: new SnakeNamingStrategy(),
  },
}));
```

`apps/myapp/src/config/mq.config.ts`（仅在用 MQ 时新建）：参考 playground 同名文件结构。

## 5. 根 Module（详见 `app-module-composition`）

`apps/myapp/src/myapp.module.ts`：复制 `app-module-composition` 中的标准模板，把 `envName` 改为 `myapp`。

## 6. main.ts（详见 `app-bootstrap-main`）

`apps/myapp/src/main.ts`：复制 `app-bootstrap-main` 模板，类名/Logger 改为 `MyappModule` / `Myapp`。

## 7. package.json 脚本

可选：在根 `package.json` 添加便捷脚本：

```json
"dev:myapp": "nest start myapp --watch --debug 9233",
"build:myapp": "nest build myapp --webpack"
```

注意调试端口（`--debug`）每个 app 应不同。

## 8. 启动验证

```bash
pnpm dev:myapp
# 期待日志：App HTTP Server is running on: http://localhost:2600 ✅
```

## 9. 业务模块铺开

参见：

- `organize-nestjs-module` — 业务 module 目录
- `implement-controller`、`implement-service`、`design-database-entity`
- `config-namespaces` — 如何为 app 扩展自定义 config 命名空间并声明类型

## 常见疏漏 checklist

- [ ] `nest-cli.json` 已注册
- [ ] `tsconfig.app.json` `outDir` 指向独立目录
- [ ] env 文件有独立 `PORT` 与 `REDIS_KEY_PREFIX`
- [ ] `.env.example` 同步
- [ ] `main.ts` 调了 `connectGlobalGuards(app)`
- [ ] `module.ts` 引入了 `import '@thomas/nestjs/common/shared/types/shared-types'`
- [ ] 不需要 MQ 的 app 删除了 `MqModule.connectMicroservices` 与 `mq.config.ts`

## 相关 skill

- `app-bootstrap-main`
- `app-module-composition`
- `env-config-conventions`
- `config-namespaces`
- `organize-nestjs-module`
- `implement-controller`
- `implement-service`
- `design-database-entity`
