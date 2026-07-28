---
name: log-file
description: 应用日志文件落盘 setupAppLogger — 默认关闭，由 APP_LOG_FILE_* env 驱动，异步滚动文件（大小/时间翻转、gzip、保留份数）；json 结构化或 text 镜像 std，落盘失败自动降级为仅控制台。
type: atomic
tags: [logging, file, ops]
when_to_use: 关键词 — 日志落盘, log file, setupAppLogger, APP_LOG_FILE, 滚动日志, FileLogger, rotating-file-stream
---


# 应用日志文件落盘 (log-file)

公共能力 `libs/core/src/nest/log-file/`。**默认关闭，零侵入**；开启后把日志异步复制一份到滚动文件，不改控制台/`docker logs` 原样输出。

## 接入

各 app `main.ts` 用 `setupAppLogger` 取代 `app.useLogger(...)`：

```typescript
import { setupAppLogger } from '@qyy-code-lego/nestjs/core/nest/log-file';

const appConfig = config.get<AppConfig>('app')!;
await setupAppLogger(app, appConfig); // 替代 app.useLogger(appConfig.logger.levels)
```

`AppConfig.logFile` 由 `resolveAppLogFileConfig` 从 env 解析，无需手动构造。

## 两种格式

| | `json`（推荐） | `text` |
|--|--|--|
| 文件内容 | 逐行结构化 JSON（可 grep/jq） | std 原文（剥离 ANSI） |
| 捕获范围 | 走 Nest `Logger` 的日志 | 所有 std（含裸 console、第三方、崩溃栈） |
| 文件级别 | 按 `APP_LOG_LEVEL` 过滤，与控制台一致 | — |

`json` 想兜底裸 `console.log`/崩溃栈，加 `APP_LOG_FILE_CAPTURE_STD=true`。

## 配置（env）

```
APP_LOG_FILE_ENABLED=false       # 总开关，默认 false
APP_LOG_FILE_FORMAT=json         # json | text
APP_LOG_FILE_DIR=./logs          # docker 下置 /app/logs
APP_LOG_FILE_NAME={app}.log      # 占位符 {app}/{pid}/{host}
APP_LOG_FILE_MAX_SIZE=20M        # 按大小翻转，空=不按大小
APP_LOG_FILE_INTERVAL=1d         # 按时间翻转，空=不按时间
APP_LOG_FILE_MAX_FILES=14        # 历史归档保留份数
APP_LOG_FILE_COMPRESS=true       # 翻转 gzip
APP_LOG_FILE_CAPTURE_STD=false   # 仅 json：捕获 uncaught/unhandled
```

## 注意

- 多进程默认每进程独立文件（`{app}.log` + 必要时 `{pid}`），翻转安全；要**共享单文件**只能用按时间翻转（按大小翻转多进程不安全）。
- 落盘失败自动降级为仅控制台，绝不阻断启动。
- 依赖 `rotating-file-stream`，关闭态懒加载不引入。

## 相关 skill

- `request-logging` — 访问日志通过 Nest Logger 输出，可被本能力落盘
- `app-bootstrap-main` — main.ts 中替换 useLogger

详见 `docs/development/log-file.md`。
