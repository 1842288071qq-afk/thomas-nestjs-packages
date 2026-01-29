<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# thomas NestJS Boilerplate

这是一个基于 NestJS 的 Monorepo 模板项目，采用模块化架构，用于快速启动新的 NestJS 应用。

## 📖 文档中心

在开始开发前，请务必阅读以下核心文档：

- [**项目架构介绍 (Introduction)**](docs/development/intro.md): 了解 Monorepo 结构、apps/libs 划分、请求生命周期及全局基础设施。
- [**开发规范指南 (Guideline)**](docs/development/guide-line.md): 掌握 Context (ALS)、身份拦截、DTO 规范、Service 范式及数据库操作等最佳实践。

## 🏗️ 工程结构

本工程采用 **Monorepo** 架构：

- **`apps/`**: 应用入口目录
  - `playground`: 示例应用

- **`libs/`**: 共享库与基础设施
  - `core`: 跨项目通用技术组件（缓存、认证、MQ 等）
  - `common`: 通用业务逻辑（Guard、共享服务等）
  - `entities`: 数据库实体与 DDL 定义

## 🚀 快速开始

### 1. 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install
```

### 2. 环境配置

配置文件位于 `env/` 目录下。请根据需要复制并创建对应的 `.env` 文件：

```bash
cp env/playground.env.example env/playground.env
```

### 3. 本地开发

启动应用：

```bash
# 启动 playground 应用
pnpm dev:playground

# 或使用 nest cli 直接启动
nest start playground --watch --debug
```

### 4. 常用命令

| 命令                               | 说明                                                           |
| :--------------------------------- | :------------------------------------------------------------- |
| `nest start <app> --watch --debug` | 启动应用，监听文件变化，并开启 debug 模式                     |
| `nest build <app>`                 | 编译应用                                                       |
| `npm run lint`                     | 运行 ESLint 校验并修复                                         |
| `npm run format`                   | 运行 Prettier 格式化代码                                       |

### 5. 调试

启动开发模式后，应用会在本地 9229 端口开启 debug。可通过以下方式进行调试：

- VS Code: 使用集成的 launch 配置进行断点调试
- Chrome DevTools: 访问 `chrome://inspect` 连接远程调试器
