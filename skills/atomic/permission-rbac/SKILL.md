---
name: permission-rbac
description: 基于 @PermissionRequired + PermissionGuard 实现 RBAC 权限码校验，支持 AND/OR/自定义函数；超管跳过校验。
type: atomic
tags: [permission, rbac, role, guard, super-admin]
---

# 权限控制 (RBAC)

工程通过 `role` -> `permission` 两级模型实现 RBAC。`PermissionGuard` 依据当前身份计算权限合集，写入 ThreadLocal 的 `permissions`，并按 `@PermissionRequired` 声明校验。

## 启用顺序

1. 必须先有身份（`@IdentityRequired` 或全局 JWT 解析后 identity 已存在）
2. Controller / 方法挂 `@UseGuards(PermissionGuard)`
3. 用 `@PermissionRequired(...)` 声明所需权限码

## 用法

```typescript
import { PermissionGuard } from '@libs/common/shared/guards/permission/permission.guard';
import { PermissionRequired } from '@libs/common/shared/guards/permission/permission-required.decorator';

@Controller('users')
@UseGuards(PermissionGuard)
export class UserController {
  // 单码
  @Post() @IdentityRequired('hospital_admin') @PermissionRequired('user.create')
  create() {}

  // AND：必须同时拥有
  @Delete() @IdentityRequired('hospital_admin')
  @PermissionRequired(['user.delete', 'user.view'])
  remove() {}

  // OR：嵌套数组任一组满足
  @Patch() @PermissionRequired([['user.update'], ['user.admin']])
  update() {}

  // 自定义函数
  @Get('audit') @PermissionRequired((codes) =>
    codes.includes('super_mode') || codes.includes('user.admin'))
  audit() {}
}
```

## 在 Service 取权限码

```typescript
const permissions = this.threadLocal.get('permissions') as string[];
```

注意：Service 不应基于 HTTP 上下文做权限分支决策，Controller 决策后显式传入。

## 超级管理员

- `OpUser.isSuper === true`：跳过所有权限校验
- `HospitalAdmin.isSuperAdmin === true`：仍需在医院最大权限范围内校验

## 相关 skill

- `auth-identity-public` — 身份是权限的前置
- `data-scope` — 行级数据权限（与功能权限正交）
- `context-threadlocal` — permissions 从 ALS 取
