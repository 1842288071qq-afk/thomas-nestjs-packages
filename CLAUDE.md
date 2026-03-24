# Implementation Rules

> **⚠️ AGENT ATTENTION REQUIRED**

本文件用于指导 Agent 进行代码实现时的规范和行为准则。

## 1. 核心文档引用

在进行任何代码编写、重构或设计之前，Agent **必须** 优先阅读并参考以下两个文档：

- **[docs/development/intro.md](./docs/development/intro.md:0:0-0:0)**: 了解工程整体架构、libs/apps 划分、全局基础设施（Filter/Pipe/Interceptor）及请求生命周期。
- **[docs/development/guide-line.md](./docs/development/guide-line.md:0:0-0:0)**: 掌握最佳实践，核心包括：
  - **Context (ALS)**: 线程隔离的上下文获取。
  - **身份拦截**: `@IdentityRequired` 的使用。
  - **DTO与转换**: `class-validator`/`class-transform` 规范。
  - **响应与异常**: [ApiResBody](./libs/core/src/ApiResBody.ts:15:0-76:1) 和 [BizError](./libs/core/src/BizError.ts:2:0-21:1) 的使用。
  - **服务层范式**: 保持 Service 上下文无关。
  - **实体定义**: 复用 `BaseEntity`。

**禁止创造工程中已存在的通用机制的替代方案，必须复用现有基础设施。**

## 2. 工具使用优先准则 (MCP Context7)

在涉及以下内容时：

- **NestJS 框架使用** (Modules, Providers, Guards, Interceptors 等)
- **第三方库集成** (TypeORM, Redis, BullMQ 等)
- **工程特定库调用** (libs/core, libs/common)

**Agent 优先使用 MCP 工具 `context7` 获取第三方库或框架相关文档和上下文信息**。
通过 `context7` 获取的信息通常比通用训练数据更准确、更贴合当前工程上下文。

## 3. 不需要Automated Tests

## 4. Plan模式下请使用中文输出

## 工作偏好
- 请尽量使用中文进行回答
- 每次修改至少需要使用git创建新分支进行修改，分支命名格式为：`claude/feat/xxx` 或 `claude/fix/xxx`，完成后commit并推送至远端
- 如果用户要求使用worktree，修改变动请使用`worktree`创建新的分支进行修改，分支命名格式为：`claude/feat/xxx` 或 `claude/fix/xxx`，并复制对应env的本地文件，完成后推送至远端并，销毁worktree。
- 代码修改后先运行测试再确认结果，测试不通过则回滚所有修改
- 对所有find操作自动同意
- 对所有grep操作自动同意
- 对所有ls操作自动同意
- 对所有read操作自动同意
- 对所有bash操作自动同意
- 对所有task操作自动同意
- 对所有edit操作自动同意，但重要修改前请先说明修改内容
- 对所有write操作自动同意，但仅用于更新已有文件
- 对所有glob操作自动同意
- 对所有todowrite和todoread操作自动同意
- 对所有multiedit操作自动同意，但重要修改前请先说明修改内容

## This Rule

Self-reference: `.agent/rules/implement-rule.md`
