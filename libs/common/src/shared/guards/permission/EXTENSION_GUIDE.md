# 权限系统扩展指南

## 概述

权限系统目前仅支持 `OP_USER`（运营平台用户）的角色和权限管理。后续如需为其他身份类型（如代理商用户、医院管理员等）添加权限控制，本指南提供了清晰的扩展方案。

## 当前架构

### 核心组件

1. **PermissionService** - 权限数据查询和缓存管理（仅支持 OpUser）
2. **PermissionGuard** - 权限检查守卫（路由级别的权限控制）
3. **PermissionRequired** - 装饰器（用于标记需要权限控制的端点）

### 权限流程

```
请求 → PermissionGuard 
       ↓
    检查身份类型
       ↓
    调用对应的权限检查方法（如：checkOpUserPermissions）
       ↓
    将权限挂载到 ThreadLocal（用于后续业务逻辑获取）
       ↓
    验证权限要求 → 放行/拒绝
```

## 扩展步骤

### 1. 为新身份类型创建权限服务

在新的身份类型对应的模块中创建权限服务：

```typescript
// libs/xxx-module/src/permission/xxx-permission.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from '@app/core/nest/cache/cache.service';

@Injectable()
export class XxxPermissionService {
  constructor(
    @InjectRepository(XxxPermission)
    private readonly permissionRepo: Repository<XxxPermission>,
    @InjectRepository(XxxRolePermission)
    private readonly rolePermissionRepo: Repository<XxxRolePermission>,
    @InjectRepository(XxxRole)
    private readonly roleRepo: Repository<XxxRole>,
    @InjectRepository(XxxUserRole)
    private readonly userRoleRepo: Repository<XxxUserRole>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 获取用户的角色和权限数据
   */
  async getUserPermissionData(userId: string): Promise<UserRoleData> {
    // 实现权限查询逻辑，参考 PermissionService.getUserPermissionData
    // 关键点：
    // 1. 查询用户的角色绑定
    // 2. 获取每个角色的权限
    // 3. 合并权限集合（求并集）
  }

  /**
   * 清除用户权限缓存
   */
  async clearUserPermissionCache(userId: string): Promise<void> {
    // 实现缓存清除逻辑
  }
}
```

### 2. 在 PermissionGuard 中添加分支处理

在 `PermissionGuard` 中添加新身份类型的权限检查方法：

```typescript
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly opPermissionService: PermissionService,
    private readonly xxxPermissionService: XxxPermissionService, // ← 注入新服务
    private readonly threadLocal: ThreadLocal,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSION_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement) {
      return true;
    }

    const store = this.threadLocal.getStore();
    if (!store || !store.identity) {
      throw new UnauthorizedException('Identity not found in context');
    }

    const { identity } = store;

    // 根据身份类型分发
    switch (identity.identityType) {
      case IdentityType.OP_USER:
        return this.checkOpUserPermissions(identity);
      case IdentityType.XXX_USER: // ← 新身份类型
        return this.checkXxxUserPermissions(identity);
      default:
        throw new ForbiddenException(
          `Permission check not supported for identity type: ${identity.identityType}`,
        );
    }
  }

  /**
   * 检查新身份类型的权限
   */
  private async checkXxxUserPermissions(identity: Identity): Promise<boolean> {
    const xxxUser = identity.xxxUser; // ← 对应的业务实体
    if (!xxxUser) {
      throw new UnauthorizedException('XxxUser not found in identity');
    }

    // 如果有超级管理员标志，直接放行
    if (xxxUser.isSuper) {
      return true;
    }

    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSION_REQUIRED_KEY,
      [this.reflector],
    );

    // 挂载权限到 ThreadLocal
    await this.mountXxxUserPermissions(xxxUser.id);

    const permissionCodes = this.threadLocal.get('permissionCodes') || [];
    if (!this.checkRequirement(requirement, permissionCodes)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private async mountXxxUserPermissions(userId: string): Promise<void> {
    if (this.threadLocal.get('permissionCodes')) {
      return;
    }

    const permData = await this.xxxPermissionService.getUserPermissionData(userId);
    this.threadLocal.set('roles', []);
    this.threadLocal.set('permissionCodes', permData.permissionCodes);
  }

  private checkRequirement(
    req: PermissionRequirement,
    permissionList: string[],
  ): boolean {
    if (typeof req === 'string') {
      return permissionList.includes(req);
    }
    if (typeof req === 'function') {
      return req(permissionList);
    }
    if (Array.isArray(req)) {
      if (req.length === 0) return true;
      if (typeof req[0] === 'string') {
        return (req as string[]).every((p) => permissionList.includes(p));
      }
      return (req as PermissionRequirement[]).some((r) =>
        this.checkRequirement(r, permissionList),
      );
    }
    return false;
  }
}
```

### 3. 更新 Identity 实体关联关系

在 `Identity` 实体中添加新身份类型的关联：

```typescript
@Entity({ name: 'identity' })
export class Identity extends BaseIdentity {
  // ... 现有关联 ...

  @OneToOne(() => XxxUser, (xxxUser) => xxxUser.identity, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  xxxUser?: XxxUser; // ← 新关联
}
```

### 4. 在 PermissionModule 中注册新服务

如果新身份类型的权限服务有独立模块，确保在 `PermissionModule` 中导入：

```typescript
@Module({
  imports: [
    EntityFeatureModule,
    CacheModule,
    XxxPermissionModule, // ← 新模块
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    PermissionService,
    PermissionGuard,
  ],
  exports: [PermissionService, PermissionGuard],
})
export class PermissionModule {}
```

## 设计原则

### 1. 隔离性（Isolation）
- 每个身份类型的权限查询逻辑独立，互不影响
- 通过不同的权限服务实现不同的业务规则

### 2. 可扩展性（Extensibility）
- 新增身份类型只需添加分支，无需修改现有逻辑
- 遵循开闭原则：对扩展开放，对修改关闭

### 3. 缓存策略（Caching）
- 每个身份类型的权限数据独立缓存
- 缓存 key 清晰，避免碰撞
- 支持细粒度的缓存清除

### 4. ThreadLocal 使用
- 权限数据在请求处理链中通过 ThreadLocal 传递
- 避免每次需要权限信息时都重复查询
- 业务代码可通过 `threadLocal.get('permissionCodes')` 获取权限列表

## 最佳实践

### 权限码命名规范

```
<模块>.<操作>
例如：
- user.view, user.create, user.update, user.delete
- order.view, order.create, order.approve
- report.export, report.view
```

### 缓存 key 命名规范

```
permission:<身份类型>:<资源类型>:<用户ID>
例如：
- permission:op_user:all_permissions
- permission:op_user:role_data:admin
- permission:op_user:user:user_id_123
```

### 角色和权限关系

- 一个用户可以拥有多个角色
- 一个角色可以拥有多个权限
- 用户的权限 = 所有角色权限的并集

### 超级管理员处理

- 超级管理员应该有一个标志字段（如 `isSuper`）
- 超级管理员在权限检查前直接放行
- 不需要查询和计算权限，提升性能

## 示例：为医院管理员添加权限管理

假设需要为医院管理员（HospitalAdmin）添加权限管理：

1. **创建权限服务**：`HospitalPermissionService`
2. **实现权限查询逻辑**：支持医院租户隔离
3. **在 PermissionGuard 中添加分支**：`checkHospitalAdminPermissions`
4. **更新 Identity 实体**：已有 `hospitalAdmin` 关联
5. **在装饰器中使用**：

```typescript
@Get('/users')
@PermissionRequired('user.view')
async getUsers() {
  // 权限自动检查，只有拥有 'user.view' 权限的医院管理员才能访问
}
```

## 调试技巧

### 检查权限是否挂载

```typescript
private someBusinessMethod() {
  const permissions = this.threadLocal.get('permissionCodes');
  console.log('Current user permissions:', permissions);
}
```

### 清除权限缓存（用于测试）

```typescript
// 在管理员修改用户角色后调用
await this.permissionService.clearUserPermissionCache(userId);
```

### 权限检查日志

在 `PermissionGuard` 中添加日志：

```typescript
private checkRequirement(req: PermissionRequirement, permissionList: string[]): boolean {
  const result = /* 检查逻辑 */;
  console.log(`Permission check: ${JSON.stringify(req)} against ${permissionList.join(',')} = ${result}`);
  return result;
}
```
