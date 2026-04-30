---
name: auth-identity-public
description: 用 @IdentityRequired 限定接口可访问身份（student/hospital_admin/op 等），用 @Public 或 jwt.whiteList 跳过 JWT 认证。
when_to_use: 关键词 — auth, identity, jwt, public, whitelist, guard
---


# 身份拦截 / 接口白名单

JWT 认证由全局 `JwtAuthGuard` 完成，业务身份校验由 `IdentityRequiredGuard` 完成。两者作用层级不同。

## @IdentityRequired

声明接口允许哪些身份访问，多个参数为 OR 关系。

```typescript
import { IdentityRequired } from '@libs/common/shared/guards/identity-required/identity-required.decorator';

@Controller('student')
export class StudentController {
  @Post('profile')
  @IdentityRequired('student')
  updateProfile() {}

  @Get('common')
  @IdentityRequired('student', 'hospital_admin') // OR
  getCommonData() {}
}
```

未匹配身份会被 Guard 拒绝。校验通过后 `identity` 写入 ThreadLocal，可在 Controller 取用。

## @Public（跳过 JWT）

```typescript
import { Public } from '@libs/core/nest/jwt-auth/decorator/public.decorator';

@Public() // 整个 Controller 公开
@Controller('auth')
export class AuthController {}

@Get('public-info')
@Public() // 单接口公开
getPublicInfo() {}
```

## jwt.whiteList（精确路径白名单）

```yaml
jwt:
  whiteList:
    - /api/v1/health
    - /api/v1/auth/login
```

仅支持精确匹配；优先用 `@Public` 装饰器，配置法适用于第三方/无源码场景。

## 相关 skill

- `permission-rbac` — 身份通过后再做权限码校验
- `context-threadlocal` — Guard 写入的 identity 从 ALS 获取
