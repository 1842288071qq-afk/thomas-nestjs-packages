<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# nestjs-boilerplate

本工程是一个 NestJS 的模版，采用 NestJS 的 Monorepo 模式。

## 📖 文档中心

在开始开发前，请务必阅读以下核心文档：

- [**项目架构介绍 (Introduction)**](docs/development/intro.md): 了解 Monorepo 结构、apps/libs 划分、请求生命周期及全局基础设施。
- [**开发规范指南 (Guideline)**](docs/development/guide-line.md): 掌握 Context (ALS)、身份拦截、DTO 规范、Service 范式及数据库操作等最佳实践。

## 🏗️ 工程结构

本工程采用 **Nx Monorepo** 架构：

- **`apps/`**: 业务进程入口。

- **`libs/`**: 核心逻辑与基础设施。
  - `core`: 跨项目通用技术组件（缓存、认证、日志等）。
  - `common`: 本项目通用业务逻辑（Guard、共享服务等）。
  - `entities`: 数据库实体与 DDL 定义。

## 🚀 快速开始

### 1. 安装开发工具与依赖

首先，全局安装 NestJS CLI：

```bash
npm install -g @nestjs/cli
```

安装项目依赖（推荐使用 `pnpm`）：

```bash
pnpm install
```

### 2. 环境配置

配置文件位于 `env/` 目录下。请根据需要复制并创建对应的 `.env` 文件。

```bash
# 例如配置 khy 应用
cp env/khy.env.example env/khy.env
```

> [!IMPORTANT]
> 框架会自动根据 `APP_NAME` 环境变量或启动命令加载对应的 `.env` 文件。

### 3. 本地开发

启动指定应用：

```bash
# 启动 khy (医院端)
pnpm dev:khy
# 或等价于
nest start khy --watch --debug

# 启动 yypt (运营端)
pnpm dev:yypt
# 或等价于
nest start yypt --watch --debug
```

| 命令                               | 说明                                                                                                              |
| :--------------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| `nest build <app> --webpack`       | 编译指定应用，并采用webpack打包（默认情况下，本工程设置了为不使用webpack，方便开发调试通过sourcemap看打印调用栈） |
| `nest start <app> --watch --debug` | 启动指定应用，监听文件变化，并开启debug模式                                                                       |
| `npm run lint`                     | 运行 ESLint 校验并修复                                                                                            |
| `npm run format`                   | 运行 Prettier 格式化代码                                                                                          |

### 4. debug断点

在运行开发模式后，都加上了`--debug`标识，此时使用任意js调试客户端attach到本地9229端口即可进行调试。

本项目集成了`vscode`的`launch.json`配置，运行开发模式后可在UI上attach进行断点调试。
