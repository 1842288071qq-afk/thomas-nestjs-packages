---
name: env-config-conventions
description: env 文件按工程根目录 env/{appName}.env 命名，{appName}.local 优先覆盖；变量按模块前缀分组（PORT/APP_/DATABASE_/REDIS_/JWT_/KAFKA_/RABBIT_）；必须维护 .env.example 同步。
type: atomic
tags: [env, config]
when_to_use: 关键词 — env, dotenv, config, naming, namespace
---


# Env 文件与变量命名规范

## 1. 文件位置与命名

所有 env 文件统一放在工程根目录 `env/`，按 app 名命名：

```text
env/
├── {appName}.env           # 标准模板（提交到仓库）
├── {appName}.env.example   # 示例 / 文档（提交到仓库）
└── {appName}.local         # 本地覆盖（gitignore，不提交）
```

加载顺序由 `configModuleImport({ envName })` 控制：先 `./env/{envName}.local`，再 `./env/{envName}.env`。**`.local` 覆盖 `.env`**，用于本地差异（DB 密码、端口等）不污染仓库。

## 2. 变量命名前缀

按模块用前缀分组，禁止扁平命名：

| 模块 | 前缀 | 示例 |
| - | - | - |
| 应用 | `PORT` / `APP_` | `PORT=2400`、`APP_NAME=nestjs-yypt`、`APP_LOG_LEVEL=info` |
| 数据库 | `DATABASE_` | `DATABASE_HOST` / `_PORT` / `_USER` / `_PASSWORD` / `_NAME` |
| Redis | `REDIS_` | `REDIS_HOST` / `_PORT` / `_DB` / `_KEY_PREFIX` / `_PASSWORD` |
| JWT | `JWT_` | `JWT_SECRET` |
| Kafka | `KAFKA_` | `KAFKA_BROKERS` / `_CLIENT_ID` / `_GROUP_ID` / `_SESSION_TIMEOUT` |
| RabbitMQ | `RABBIT_` | `RABBIT_URLS` / `_QUEUE` |
| 文件 | `FILE_` | `FILE_LOCAL_STORAGE_ROOT` / `FILE_LOCAL_SERVE_ROOT` |

## 3. REDIS_KEY_PREFIX 必填

每个 app 必须设置独立的 `REDIS_KEY_PREFIX`（推荐 `nestjs-{appName}:`），避免多 app 共用 Redis 时缓存键冲突。

## 4. example 同步

新增 / 删除 env 变量必须同步更新 `{appName}.env.example`，作为对外文档与新成员快速启动的依据。带敏感默认值的字段在 example 里留空 / 用占位符。

## 5. 在代码中读取

env 不直接 `process.env.X` 散落各处，统一在 `apps/{app}/src/config/*.config.ts` 内通过 `registerAs(...)` 收敛，业务代码用 `ConfigService<AllConfig>.get(...)` 读取。详见 `config-service`。

```typescript
export const datasourceConfig = registerAs('datasource', () => ({
  default: {
    type: 'postgres' as const,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    // ...
  },
}));
```

## 相关 skill

- `config-service` — 业务侧读取
- `app-module-composition` — `configModuleImport` 加载入口
- `create-new-app` — 新建 app 时的 env 初始化
