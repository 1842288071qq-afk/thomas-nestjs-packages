# Skills — thomas NestJS 公共子模块

本目录是「文档 → AI Skill」的权威源，按 [Anthropic Claude Code Skill](https://docs.anthropic.com/claude/docs) 风格组织：每个 skill 一个目录，内含 `SKILL.md`，frontmatter 包含 `name` / `description` / `type` / `tags`。

CLI 工具 [`bin/install-skills.mjs`](./bin/install-skills.mjs) 把源 skill 一键安装到消费工程的指定 AI 工具目录（claude-code / github-copilot / codex）。

## 1. 分层

- **`atomic/`** — 元 skill。一个规范点为一个 skill（如 `dto-validation`、`biz-error`），用于精准匹配单一关注点
- **`composite/`** — 任务级 skill。围绕一个高层动作（如 `implement-controller`、`design-database-entity`）组合多个元 skill 的 checklist 与模板，便于「我要做 X」的整体指引

Composite 通过正文中的「相关 skill」段落引用 atomic，AI agent 可顺藤摸瓜按需精读。

## 2. Skill 索引

### Atomic（元）

| Skill | 关键词 |
| - | - |
| `app-bootstrap-main` | main.ts / NestFactory / AppConfig / connectGlobalGuards / apiPrefix |
| `app-module-composition` | 根 Module / configModuleImport / applyTypeOrmDs / GlobalModule |
| `env-config-conventions` | env/{appName}.env / .local 覆盖 / 变量前缀 / REDIS_KEY_PREFIX |
| `context-threadlocal` | ALS / Store / requestId / account / identity |
| `auth-identity-public` | `@IdentityRequired` / `@Public` / `jwt.whiteList` |
| `permission-rbac` | `@PermissionRequired` / PermissionGuard / 超管 |
| `data-scope` | WithScopeStrategy / DataScopeEngine / 行级权限 |
| `config-namespaces` | AllConfig 接口 / declare global / AppConfig / 扩展命名空间 |
| `config-service` | ConfigService / 点路径 + 默认值 |
| `cache-wrap` | `CacheService.wrap` / 防击穿 |
| `redis-kv` | RedisService set/get / 自动序列化 |
| `response-apiresbody` | ApiResBody / 全局过滤器 |
| `biz-error` | BizError / codeAs / httpStatusAs |
| `dto-validation` | class-validator / `@ToDate` / `@EnsureNotBlank` / 嵌套 |
| `range-query` | `@ParseRange` / `@ParseDateTimeRange` |
| `entity-base` | `EntityWithIdAndTimeTrace` / Snowflake / Mixin |
| `service-paradigm` ⚠️ | 上下文无关 / interface 入参 / 对象参数 / 查询分层 |
| `pagination-and-list` ⚠️ | PaginationDTO / IPageData / ListLimitDto / simple-list |
| `restful-style` ⚠️ | Query 参数定位 / DTO 不携带 id / PATCH 返完整对象 |
| `type-safety` ⚠️ | 禁止 as any / 敏感信息独立 |
| `serialization-vo` ⚠️ | `@Exclude` / `@Expose` / vo-transform / DTO-VO 分层 |
| `file-management` | LocalUploadService / FileService / translateIds |

### Composite（任务级）

| Skill | 用途 |
| - | - |
| `create-new-app` | 在 monorepo 内新增 app 全流程 |
| `implement-controller` | 实现 Controller 全流程 |
| `implement-service` | 实现 Service 全流程 |
| `design-database-entity` | 数据库实体设计 |
| `design-sql-query` | TypeORM 查询 / SQL 设计 |
| `implement-file-upload` | 文件上传 / 详情翻译 |
| `design-api-doc` | 接口文档设计 |
| `organize-nestjs-module` | NestJS 模块目录规范 |

## 3. 安装到消费工程

在消费工程根目录（已通过 git submodule 引入本包，假设位于 `packages/thomas-nestjs/`）执行：

```bash
node packages/thomas-nestjs/skills/bin/install-skills.mjs --target=claude-code
node packages/thomas-nestjs/skills/bin/install-skills.mjs --target=copilot
node packages/thomas-nestjs/skills/bin/install-skills.mjs --target=codex
```

可选参数：

- `--target=<claude-code|copilot|codex|all>` — 必填（除非 `--list`）
- `--out=<path>` — 自定义输出根目录，默认按工具约定
- `--dry-run` — 仅打印将要写的文件
- `--list` — 列出本包所有可用 skill
- `--force` — 覆盖已有同名文件（默认会跳过）

各工具的输出位置：

| Target | 输出位置 |
| - | - |
| `claude-code` | `<cwd>/.claude/skills/thomas-nestjs/{atomic,composite}/<name>/SKILL.md` |
| `copilot` | `<cwd>/.github/instructions/thomas-nestjs.<name>.instructions.md`（含 `applyTo: "**"`） |
| `codex` | `<cwd>/.codex/skills/thomas-nestjs/<name>.md` + 在 `AGENTS.md` 追加索引段（幂等） |

## 4. 编写 / 维护

新增 skill：

1. 选择层级（atomic / composite）建目录 `<name>/SKILL.md`
2. frontmatter 至少包含 `name`、`description`、`type`、`tags`；`description` **务必精简且关键词完整**（用于 AI 匹配）
3. 内容遵循「做什么 / 不做什么 / 示例 / 相关 skill」结构
4. 在 README 索引表增加条目

> Skill 的 `description` 是检索精度的核心，控制在 1-2 句、覆盖关键场景词。
