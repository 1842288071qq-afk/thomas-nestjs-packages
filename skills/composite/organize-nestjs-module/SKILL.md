---
name: organize-nestjs-module
description: NestJS 业务模块的目录组织 — dto/、vo/、{module}.controller.ts、{module}.service.ts、{module}.vo-transform.ts；Service 不依赖 vo-transform。
type: composite
tags: [module, organize, structure, nestjs, dto, vo]
---

# NestJS 模块目录规范

每个业务模块按下列结构组织（默认）：

```text
apps/{app}/src/{module}/
├── dto/
│   └── {module}.dto.ts          # 请求 DTO + Service 入参 interface（必要时拆 *.types.ts）
├── vo/
│   └── {module}.types.ts        # 响应 VO 类型 / Class
├── {module}.controller.ts
├── {module}.service.ts
├── {module}.vo-transform.ts     # Service DTO/Entity → VO 的转换函数
└── {module}.module.ts
```

## 职责约束

| 文件 | 允许做 | 禁止做 |
| - | - | - |
| `dto/` | 请求 DTO 定义 + class-validator 装饰器 + Service 入参 interface | 写业务逻辑 |
| `vo/` | 响应 VO 类型与 Class（含 `@Exclude`/`@Expose`） | 写业务逻辑 |
| `controller.ts` | 路由、装饰器、取上下文、调 Service、调 vo-transform、声明返回类型 | 写复杂业务、读写 DB |
| `service.ts` | 业务逻辑、TypeORM、缓存、`BizError`、Service interface | 用 ThreadLocal、依赖 vo-transform、构造展示态 |
| `vo-transform.ts` | DTO/Entity → VO 的纯函数 | 调用 Service、读写 DB |
| `module.ts` | provider/import 注册 | — |

## 多 Controller 模块

一个业务可包含多个 Controller（如 `user.admin.controller.ts` 与 `user.public.controller.ts`），共用 `service` 与 `vo-transform`。

## 相关 skill

- `serialization-vo` — VO 装饰器与拦截器
- `service-paradigm` — Service 纯净
- `dto-validation` — DTO 字段规范
