# 应用日志文件落盘（异步滚动 + 翻转）

> 公共能力，位于 `libs/core/src/nest/log-file/`，通过 `@qyy-code-lego/nestjs/core/nest/log-file` 导出。
> 默认关闭，完全由 env（`APP_LOG_FILE_*`）驱动；关闭时对进程 std 输出**零侵入**，开发态保持原样。

## 1. 背景与目标

容器化（docker compose）部署时，进程日志默认只进 `docker logs`（json-file 驱动），既不持久化也不翻转、不易管理。本能力让**进程自身**把日志异步复制一份到滚动文件，支持按大小/时间翻转、压缩与保留清理：

- **异步、不阻塞**：底层用 [`rotating-file-stream`](https://www.npmjs.com/package/rotating-file-stream)（rfs）可写流，带缓冲，不影响请求主流程与性能。
- **零侵入开发态**：默认关闭即等价于原 `app.useLogger(levels)`；即便开启，控制台/`docker logs` 输出也始终保持原样（只新增，不改写）。
- **可结构化控制**：支持 `json`（结构化逐行）与 `text`（原样镜像 std）两种格式。
- **落盘失败自动降级**：初始化或写入异常时回退为「仅控制台」，绝不阻断启动或拖垮业务。

## 2. 架构

```
main.ts  ──►  setupAppLogger(app, appConfig)
                     │
       ┌─────────────┼──────────────────────────┐
       │ disabled    │ json                      │ text
       ▼             ▼                           ▼
 useLogger(levels)  FileLogger(extends           保持默认 Console 输出
 （原样，零侵入）     ConsoleLogger)              ＋ tee process.stdout/stderr
                     ├─ super.* → 控制台原样        （原样转发后复制到文件）
                     └─ JSON 行 → sink
                     ＋ 可选 crash 安全网
                                  │
                                  ▼
                         LogFileSink（rfs 滚动文件）
```

- `setup-app-logger.ts`：统一安装入口，按 env 选择机制。
- `file-logger.ts`：`FileLogger extends ConsoleLogger`，控制台交给 `super`，额外写结构化 JSON。
- `log-file-sink.ts`：封装 rfs，解析文件名占位符与翻转选项；懒加载 rfs（关闭态不加载依赖）。
- `std-capture.ts`：`text` 模式 tee std 流；`json` 模式可选 `installCrashCapture` 捕获进程级崩溃。

## 3. 两种格式的取舍

| 维度 | `json`（推荐） | `text` |
|------|--------------|--------|
| 文件内容 | 逐行 `{ts,level,context,app,pid,msg,trace?,details?}` | 原样 std 文本（剥离 ANSI 颜色） |
| 捕获范围 | 走 Nest `Logger` 的日志 | **所有** std 输出（含裸 `console.log`、第三方、Node 崩溃栈） |
| 可检索性 | 强（字段化、可 grep/jq） | 弱（纯文本） |
| 机制 | 注入自定义 Logger（非侵入 std） | monkey-patch `process.stdout/stderr.write` |
| 控制台 | 原样（`super` 打印） | 原样（先转发真实 write） |

- 想要**结构化可控** → `json`。若担心漏掉裸 `console.log` / 崩溃栈，叠加 `APP_LOG_FILE_CAPTURE_STD=true` 作为安全网（仅补进程级崩溃，不重复 tee，避免与 Logger 输出重复）。
- 想要**与 `docker logs` 完全一致的原文** → `text`。

## 4. 多进程：相同文件 vs 不同文件

文件名由 `APP_LOG_FILE_NAME` 模板控制，占位符 `{app}` / `{pid}` / `{host}` 在启动时一次性解析。

- **不同文件（默认，推荐，翻转安全）**：模板含 `{app}`（必要时再加 `{pid}`），如 `{app}.log`。各进程写各自文件，按大小/时间翻转都安全。
- **相同文件（多进程共享）**：设静态名如 `app.log`，多个进程写同一文件。注意翻转约束：
  - 追加写本身安全：POSIX `O_APPEND` 对 ≤4KB 的写入原子，行级不会交错损坏。
  - **按大小翻转不是多进程安全的**：多个进程各自 rename → 竞争丢日志。共享文件请改用**按时间翻转**（`APP_LOG_FILE_INTERVAL`，留空 `APP_LOG_FILE_MAX_SIZE`）：各进程在同一时间边界各自滚动，无 rename 竞争。

> 结论：默认 `{app}.log` 已满足绝大多数场景；要合并成单文件时，请用时间翻转，或干脆每进程独立文件再用外部工具聚合。

## 5. 配置项（env）

| 变量 | 默认 | 说明 |
|------|------|------|
| `APP_LOG_FILE_ENABLED` | `false` | 总开关；关闭时零侵入 |
| `APP_LOG_FILE_FORMAT` | `json` | `json` \| `text` |
| `APP_LOG_FILE_DIR` | `./logs` | 目录（相对 cwd 或绝对）；docker 模板下置为 `/app/logs` |
| `APP_LOG_FILE_NAME` | `{app}.log` | 文件名模板，占位符 `{app}`/`{pid}`/`{host}` |
| `APP_LOG_FILE_MAX_SIZE` | `20M` | 按大小翻转阈值；留空不按大小 |
| `APP_LOG_FILE_INTERVAL` | `1d` | 按时间翻转间隔（`1d`/`12h`/`30m`）；留空不按时间 |
| `APP_LOG_FILE_MAX_FILES` | `14` | 历史归档保留份数；留空不限制 |
| `APP_LOG_FILE_COMPRESS` | `true` | 翻转归档是否 gzip |
| `APP_LOG_FILE_CAPTURE_STD` | `false` | 仅 `json`：额外捕获 uncaughtException/unhandledRejection |

## 6. 接入方式

各 app `main.ts` 用 `setupAppLogger` 取代原 `app.useLogger(...)`：

```ts
import { setupAppLogger } from '@qyy-code-lego/nestjs/core/nest/log-file';

// ...
const appConfig = config.get<AppConfig>('app')!;
await setupAppLogger(app, appConfig); // 取代 app.useLogger(appConfig.logger.levels)
```

`AppConfig.logFile` 由 `resolveAppLogFileConfig`（`libs/common/src/config/app.config.ts`）从 env 解析，无需手动构造。

## 7. docker compose 协同

模板（`server/docker/docker-compose.yml`）已默认：

- 为容器 `stdout/stderr` 设置 `logging` 上限（`max-size: 20m` / `max-file: 5`），避免 `docker logs` 占满磁盘。
- 挂载 `./logs:/app/logs`，并以 `APP_LOG_FILE_DIR=/app/logs` 统一落盘目录。
- `logs/` 刻意与 `run/` **同级**（兄弟目录），避免 rsync 同步 `run/` 时被一并删除。

是否真正落盘仍由各 `env/{appName}.env` 的 `APP_LOG_FILE_ENABLED` 决定（默认关闭）。

## 8. 边界与已知限制

- **崩溃最后一条可能丢失**：进程崩溃退出极快，rfs 异步缓冲可能来不及 flush 最后一条记录（`docker logs` 仍可兜底）。
- **依赖**：`rotating-file-stream` 声明在公共包 `package.json`，经 `build-run` 的 `mergeDependencies` 自动并入 `run/package.json`，容器内 `installer` 安装即可；关闭态走懒加载，不强依赖。
- **text 模式**：落盘前剥离 ANSI 颜色；其余字节原样。
