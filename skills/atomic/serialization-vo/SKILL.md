---
name: serialization-vo
description: 全局 ClassSerializeInterceptor 按类装饰器序列化；接口返回默认用 VO（@Exclude/@Expose/@Transform），通过模块内 vo-transform 把 Service DTO 转 VO；Service 不依赖 vo-transform。
when_to_use: 关键词 — vo, serialization, class-transformer, exclude, expose, vo-transform
---


# 数据序列化与 VO ⚠️ Strict

工程全局启用 `ClassSerializeInterceptor`（基于 `class-transformer.instanceToPlain`），尊重类装饰器；之后 `DateSerializeInterceptor` 统一格式化 Date 字段并按 `x-timezone` 头转换时区。

## 1. 常用装饰器

- `@Exclude()` — 隐藏字段，不出现在响应 JSON
- `@Expose()` — 暴露字段；常用于 getter 虚拟属性
- `@Transform()` — 自定义序列化逻辑

## 2. Entity-Extension VO 模式

接口需要特殊展现（隐藏字段 / 虚拟属性）但不污染 Entity 时，**继承 Entity** 写 VO：

```typescript
export class AgentDetailVO extends OpAgent {
  @Exclude() users: any;       // 覆写父类，本接口隐藏

  @Expose()
  get agentAccount() {
    return this.users?.[0]?.identity?.opAccount;
  }
}

// Controller
@Get('detail')
async getDetail(@Query('id') id: string) {
  const data = await this.service.getDetail(id);
  return plainToInstance(AgentDetailVO, data); // 拦截器按 VO 装饰器渲染
}
```

## 3. DTO/VO 分层规范（默认）

每个 NestJS 业务模块按下列方式组织：

```text
apps/{app}/src/{module}/
├── dto/
│   └── {module}.dto.ts          # 请求 DTO，Controller -> Service 的入参
├── vo/
│   └── {module}.types.ts        # 响应 VO 类型
├── {module}.controller.ts
├── {module}.service.ts
└── {module}.vo-transform.ts     # Service DTO/Entity -> VO
```

| 规则 | 内容 |
| - | - |
| Service | 仅返回 DTO/Entity/聚合对象，**禁止依赖 vo-transform** |
| vo-transform | 仅 Controller 层调用，组装展示态字段 |
| Controller | 必须显式声明返回类型（VO 或 DTO） |
| 简单结构 | 可直接返回 Service DTO，但谨慎使用 |

## 4. DTO -> VO 示例

```typescript
// service：纯净 DTO
export interface UserDetailDTO { id: string; name: string; internalStatus: number; }

// vo
export interface UserDetailVO { id: string; name: string; statusText: string; }

// vo-transform
export function toUserDetailVO(dto: UserDetailDTO): UserDetailVO {
  return { id: dto.id, name: dto.name, statusText: dto.internalStatus === 1 ? '启用' : '禁用' };
}

// controller
@Get('detail')
async detail(@Query('id') id: string): Promise<UserDetailVO> {
  return toUserDetailVO(await this.userService.getDetail(id));
}
```

## 相关 skill

- `service-paradigm` — Service 不构造展示态
- `dto-validation` — 请求侧 DTO 校验
