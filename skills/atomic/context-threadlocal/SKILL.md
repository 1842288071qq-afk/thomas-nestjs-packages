---
name: context-threadlocal
description: 通过 ThreadLocal(ALS) 在请求生命周期内获取 account/identity/requestId 等上下文；仅 Controller/Guard/Interceptor 层使用，Service 层禁止。
type: atomic
tags: [als, context]
when_to_use: 关键词 — als, threadlocal, context, account, identity, requestId
---


# Context / ThreadLocal (ALS)

工程使用 `AsyncLocalStorage` 封装的 `ThreadLocal` 在请求范围内透传上下文，避免层层传 Request。

## Store 结构

`ThreadLocalStore` 接口聚合多个模块字段，常用：

- `requestId: string` — 请求唯一标识
- `account: Account | OpAccount` — 当前登录账号
- `identity: BaseAccountIdentity` — 当前操作身份（学生 / 医院管理员 / OP 等）
- `permissions: string[]` — 当前身份权限码列表（由 PermissionGuard 写入）

## 使用

```typescript
import { ThreadLocal } from '@libs/core/nest/als/thread-local';

@Injectable()
export class SomeService {
  constructor(private readonly threadLocal: ThreadLocal) {}

  read() {
    const store = this.threadLocal.getStore();
    return store?.account?.id;
  }
}
```

也可使用 `threadLocal.get('identity')` 获取单字段（注意运行时返回 `unknown`，需配合断言，参见 `type-safety`）。

## 严格约束

- **Service 层禁止使用 ThreadLocal**：会导致 Service 与 HTTP 上下文耦合，无法在 Cron / RPC / 测试中复用。在 Controller 取出后显式传入 Service。详见 `service-paradigm`。
- 从 ALS 拿到的字段必须显式断言为业务实体类型（如 `as AccountIdentity`），不要 `as any`。详见 `type-safety`。

## 相关 skill

- `service-paradigm` — Service 上下文无关
- `auth-identity-public` — 写入 identity 的来源
- `permission-rbac` — 写入 permissions 的来源
- `type-safety` — ALS 取值后的类型断言规范
