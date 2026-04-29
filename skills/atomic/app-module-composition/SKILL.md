---
name: app-module-composition
description: app 根 Module 必备组合 — configModuleImport 加载配置、applyTypeOrmDs 注册数据源、GlobalModule、CoreEntityFeatureModule、AccountDeserializeModule、IdentityRequiredModule、PermissionModule、RedisModule、JwtAuthModule.forRoot()。
type: atomic
tags: [module, root-module, configModuleImport, applyTypeOrmDs, GlobalModule]
---

# App Root Module 组合规范

每个 app 的 `apps/{app}/src/{app}.module.ts` 按以下结构组装基础设施。**不要重新发明等价 Module。**

## 标准模板

```typescript
import { Module } from '@nestjs/common';
import { configModuleImport } from '@thomas/nestjs/common/config/configModuleImport';
import { applyTypeOrmDs } from '@thomas/nestjs/common/config/applyTypeOrmDs';
import { GlobalModule } from '@thomas/nestjs/core/nest/global.module';
import { CoreEntityFeatureModule } from '@thomas/nestjs/common/shared';
import { AccountDeserializeModule } from '@thomas/nestjs/common/shared/guards/account-deserialize/account-deserialize.module';
import { IdentityRequiredModule } from '@thomas/nestjs/common/shared/guards/identity-required/identity-required.module';
import { PermissionModule } from '@thomas/nestjs/common/shared/guards/permission/permission.module';
import { RedisModule } from '@thomas/nestjs/core/nest/redis/redis.module';
import { JwtAuthModule } from '@thomas/nestjs/core/nest/jwt-auth';
import '@thomas/nestjs/common/shared/types/shared-types'; // ThreadLocalStore 类型聚合

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

## 不要做

- 不要直接 `ConfigModule.forRoot(...)` 自行装配 — 使用 `configModuleImport`
- 不要直接 `TypeOrmModule.forRoot(...)` 自行装配 — 使用 `applyTypeOrmDs`
- 不要省略 `import '...common/shared/types/shared-types'`，否则 ThreadLocalStore 类型聚合丢失

## 相关 skill

- `app-bootstrap-main` — main.ts 启动流程
- `env-config-conventions` — env 命名与加载
- `config-service` — 配置读取
