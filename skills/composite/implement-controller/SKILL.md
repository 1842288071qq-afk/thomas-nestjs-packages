---
name: implement-controller
description: 实现一个 NestJS Controller 的标准流程 — 身份/权限装饰器、DTO 校验、RESTful 路径与参数、ApiResBody 返回类型、VO 转换、分页/列表区分。
type: composite
tags: [controller, nestjs, implement, http]
---

# 实现 Controller 全流程

按以下顺序设计每个 Controller 方法。每一项链接到对应元 skill。

## 1. 路由与参数风格

- Query 定位资源（禁用 `@Param`），修改类 DTO 不携带 `id`，PATCH/PUT 返回完整对象
- 详见 `restful-style`

## 2. 身份与权限

- `@IdentityRequired(...)` 限定身份；`@Public()` 标记白名单接口
- 需要权限码时 Controller 挂 `@UseGuards(PermissionGuard)` 并用 `@PermissionRequired(...)`
- 详见 `auth-identity-public`、`permission-rbac`

## 3. 请求 DTO

- `dto/` 目录维护
- 时间字段 **必须 `@ToDate`**，布尔字段 `@Transform(parseBooleanGeneral)`，非空字符串 `@EnsureNotBlank`，嵌套用 `@Type + @ValidateNested`
- 范围字段用 `@ParseRange` / `@ParseDateTimeRange`
- 详见 `dto-validation`、`range-query`

## 4. 上下文取值

- 在 Controller 内取 `threadLocal.getStore()`，断言为业务类型，**显式传给 Service**
- 严禁让 Service 直接读 ALS
- 详见 `context-threadlocal`、`type-safety`

## 5. 调用 Service 与返回

- 分页接口：参数走 `PaginationDTO`，Service 分页字段单独传，返回 `IPageData<T>`，Service 方法名含 `Page`
- 列表接口：DTO `extends ListLimitDto`，返回 `IListData<T>`
- 简单下拉：`/simple-list` 返回 `{id,name}[]`
- 详见 `pagination-and-list`

## 6. 响应封装与 VO

- 方法显式声明返回类型（VO 或 `ApiResBody<VO>`）
- Service 返回 DTO/Entity，Controller 调 `vo-transform` 转 VO；或对 Entity-Extension VO 用 `plainToInstance`
- 详见 `response-apiresbody`、`serialization-vo`

## 7. 异常

- 业务前置校验失败抛 `BizError`（在 Service 内即可），Controller 不需 try/catch
- 详见 `biz-error`

## 模板

```typescript
@Controller('user')
@UseGuards(PermissionGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly threadLocal: ThreadLocal,
  ) {}

  @Get('page')
  @IdentityRequired('hospital_admin')
  @PermissionRequired('user.view')
  async findPage(
    @Query() query: UserQueryDTO,
    @Query() pagination: PaginationDTO,
  ): Promise<ApiResBody<IPageData<UserListVO>>> {
    const identity = this.threadLocal.get('identity') as AccountIdentity;
    const result = await this.userService.findUserPage(
      query, pagination.page, pagination.pageSize, identity.hospitalAdmin.hospitalId,
    );
    return ApiResBody.of({
      ...result,
      rows: result.rows.map(toUserListVO),
    });
  }

  @Patch()
  @IdentityRequired('hospital_admin')
  @PermissionRequired('user.update')
  async update(
    @Query('id') id: string,
    @Body() dto: UpdateUserDTO,
  ): Promise<ApiResBody<UserDetailVO>> {
    const updated = await this.userService.updateUser(id, dto);
    return ApiResBody.of(toUserDetailVO(updated));
  }
}
```

## 相关 skill

- `restful-style`
- `auth-identity-public`
- `permission-rbac`
- `dto-validation`
- `range-query`
- `context-threadlocal`
- `type-safety`
- `pagination-and-list`
- `response-apiresbody`
- `serialization-vo`
- `biz-error`
