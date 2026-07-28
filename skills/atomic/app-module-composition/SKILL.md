---
name: app-module-composition
description: app 根 Module 必备组合 — configModuleImport 加载配置、applyTypeOrmDs 注册数据源、GlobalModule、CoreEntityFeatureModule、AccountDeserializeModule、IdentityRequiredModule、PermissionModule、RedisModule、JwtAuthModule.forRoot()。
type: atomic
tags: [module, config]
when_to_use: 关键词 — module, root-module, configModuleImport, applyTypeOrmDs, GlobalModule
---


# App Root Module 组合规范

每个 app 的 `apps/{app}/src/{app}.module.ts` 按以下结构组装基础设施。**不要重新发明等价 Module。**

## 标准模板

```typescript
import { Module } from '@nestjs/common';
import { configModuleImport } from '@qyy-code-lego/nestjs/common/config/configModuleImport';
import { applyTypeOrmDs } from '@qyy-code-lego/nestjs/common/config/applyTypeOrmDs';
import { GlobalModule } from '@qyy-code-lego/nestjs/core/nest/global.module';
import { CoreEntityFeatureModule } from '@qyy-code-lego/nestjs/common/shared';
import { AccountDeserializeModule } from '@qyy-code-lego/nestjs/common/shared/guards/account-deserialize/account-deserialize.module';
import { IdentityRequiredModule } from '@qyy-code-lego/nestjs/common/shared/guards/identity-required/identity-required.module';
import { PermissionModule } from '@qyy-code-lego/nestjs/common/shared/guards/permission/permission.module';
import { RedisModule } from '@qyy-code-lego/nestjs/core/nest/redis/redis.module';
import { JwtAuthModule } from '@qyy-code-lego/nestjs/core/nest/jwt-auth';
import '@qyy-code-lego/nestjs/common/shared/types/shared-types'; // ThreadLocalStore 类型聚合

import { datasourceConfig } from './config/datasource.config';
import { mqConfig } from './config/mq.config';

@Module({
  imports: [
    // 1. 配置加载（envFilePath 由 envName 决定）
    configModuleImport({
      configs: [datasourceConfig, mqConfig], // app 私有 config（除内置的 app/file/redis/session/jwt 外的扩展）
      envName: 'yypt',                        // 对应 env/yypt.env
    }),
    // 2. 数据源（默认读 'datasource' key 下的 default；多源时传 datasourceNameList）
    ...applyTypeOrmDs({ configKey: 'datasource', datasourceNameList: ['default'] }),
    // 3. 全局基础设施（Filter/Pipe/Interceptor 注册）
    GlobalModule,
    // 4. 核心实体 forFeature
    CoreEntityFeatureModule,
    // 5. 账号反序列化（解析 JWT payload -> account 实体并写入 ALS）
    AccountDeserializeModule,
    // 6. 身份拦截
    IdentityRequiredModule,
    // 7. 权限拦截
    PermissionModule,
    // 8. Redis
    RedisModule,
    // 9. JWT 认证（forRoot 读取 jwt 配置）
    JwtAuthModule.forRoot(),
  ],
  controllers: [],
  providers: [],
})
export class YyptModule {}
```

## 顺序约定

上述 imports 顺序具有语义（先配置 -> 再数据源 -> 再基础设施 -> 再业务）。**新 app 复制顺序，业务 Module 追加在最后。**

## 多数据源

```typescript
applyTypeOrmDs({
  configKey: 'datasource',
  datasourceNameList: ['default', 'audit'], // 'default' 为默认，其它按 name 注入
})
```

`datasource.config.ts` 内对应返回 `{ default: {...}, audit: {...} }`。注入时：

```typescript
@InjectRepository(LogEntity, 'audit') private readonly auditLog: Repository<LogEntity>;
```

## 可选基础设施模块（按需追加在业务 Module 前）

- `RequestLogsModule.forRoot({ systemType, accessLogEnabled, persistEnabled })` — HTTP 请求日志（访问日志 + 持久化），见 `request-logging`
- `HealthModule.forRoot()` — 暴露 `/health`、`/health/ready`，见 `health-check`

> 应用日志文件落盘不在根 Module 装配，而在 `main.ts` 用 `setupAppLogger` 接入，见 `log-file`。

## 不要做

- 不要直接 `ConfigModule.forRoot(...)` 自行装配 — 使用 `configModuleImport`
- 不要直接 `TypeOrmModule.forRoot(...)` 自行装配 — 使用 `applyTypeOrmDs`
- 不要省略 `import '...common/shared/types/shared-types'`，否则 ThreadLocalStore 类型聚合丢失

## 相关 skill

- `app-bootstrap-main` — main.ts 启动流程
- `env-config-conventions` — env 命名与加载
- `config-service` — 配置读取、AllConfig 类型体系与扩展
- `request-logging` / `health-check` / `log-file` — 可选基础设施能力
