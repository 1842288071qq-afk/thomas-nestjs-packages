---
name: config-namespaces
description: 兼容入口：配置命名空间、AllConfig、AppConfig、registerAs 扩展等内容已并入 `config-service`；命中本 skill 时优先跳转阅读 `config-service`。
type: atomic
tags: [config, allconfig]
when_to_use: 关键词 — config, AllConfig, AppConfig, namespace, registerAs, declare-global
---


# Config 命名空间（兼容入口）

本 skill 保留是为了兼容旧关键词检索；**配置体系的权威说明已并入 `config-service`**。

重点包含：

- `AllConfig` 的 declaration merging
- 内置命名空间（`app` / `session` / `datasource` / `file` / `questionBank`）
- `ConfigService<AllConfig>` 的类型化读取
- `registerAs` + `configModuleImport` 扩展自定义命名空间
- 配置的约定大于配置原则

## 相关 skill

- `config-service` — 配置体系权威说明
- `app-module-composition` — `configModuleImport` 的组装位置
- `app-bootstrap-main` — main.ts 中获取 `AppConfig`
- `env-config-conventions` — env 变量命名与加载
