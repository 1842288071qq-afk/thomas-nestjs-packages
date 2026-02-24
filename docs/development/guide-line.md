# Development Guideline

本指南介绍工程中既定的最佳实践和工具使用方法。

## 1. Context / ThreadLocal (ALS)

使用 `ThreadLocal` 获取当前请求上下文（如用户信息），无需层层传递 Request 对象。

**Store 类型定义 (ThreadLocalStore):**
全局 `ThreadLocalStore` 接口聚合了多个模块的定义，主要包含以下属性：

- `requestId` (`string`): 请求的唯一标识。
- `account` (`Account | OpAccount`): 当前登录的账号实体。
- `identity` (`BaseAccountIdentity`): 当前操作的身份实体（如学生身份、管理员身份）。

**代码示例:**

```typescript
import { ThreadLocal } from '@libs/core/nest/als/thread-local';

@Injectable()
export class SomeService {
  constructor(private readonly threadLocal: ThreadLocal) {}

  doSomething() {
    // 获取当前 Store
    const store = this.threadLocal.getStore();
    if (store?.account) {
      console.log('User ID:', store.account.id);
      console.log('Request ID:', store.requestId);
    }
  }
}
```

## 2. 身份拦截 (Identity Interception)

使用 `@IdentityRequired` 装饰器标识接口需要的特定身份，进行拦截校验。

**代码示例:**

```typescript
import { IdentityRequired } from '@libs/common/shared/guards/identity-required/identity-required.decorator';

@Controller('student')
export class StudentController {
  @Post('profile')
  // 仅允许 'student' 身份访问
  @IdentityRequired('student')
  updateProfile() {
    return 'success';
  }

  @Get('common')
  // 允许 'student' 或 'hospital_admin' 访问
  @IdentityRequired('student', 'hospital_admin')
  getCommonData() {
    return 'data';
  }
}
```

## 3. 接口白名单 (Public Whitelist)

### 方法一：使用 Decorator (推荐)

在 Controller 或 Handler 上使用 `@Public()` 跳过 JWT 认证。

```typescript
import { Public } from '@libs/core/nest/jwt-auth/decorator/public.decorator';

@Public() // 整个 Controller 公开
@Controller('auth')
export class AuthController { ... }

// 或者仅单个接口公开
@Get('public-info')
@Public()
getPublicInfo() { ... }
```

### 方法二：使用 Config 配置

在配置文件中通过 `jwt.whiteList` 配置路径（支持 exact match）。

```yaml
jwt:
  whiteList:
    - /api/v1/health
    - /api/v1/auth/login
```

## 4. 配置获取 (Configuration)

使用 NestJS 原生 `ConfigService` 获取配置。

**代码示例:**

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private readonly config: ConfigService) {}

  getAction() {
    // 获取配置，支持默认值
    const dbHost = this.config.get<string>('database.host', 'localhost');
    const port = this.config.get('PORT');
  }
}
```

## 5. Redis 缓存 (Cache Wrap)

使用 `CacheService.wrap` 自动处理 "查缓存 -> 没命中查DB -> 写入缓存 -> 返回" 的流程。防止缓存击穿和代码冗余。

**代码示例:**

```typescript
import { CacheService } from '@libs/core/nest/cache/cache.service';

@Injectable()
export class UserService {
  constructor(private readonly cacheService: CacheService) {}

  async getUserInfo(userId: string) {
    // 自动缓存，key 为 user:info:{userId}，TTL 60秒
    return await this.cacheService.wrap(
      {
        key: `user:info:${userId}`,
        ttl: 60,
        // 可选：条件不满足时不缓存 (例如结果为空时不缓存)
        unless: (result) => !result,
      },
      async () => {
        // 实际业务逻辑 (回源)
        return await this.userRepo.findOne(userId);
      },
    );
  }
}
```

### 5.1 Redis KV 存储规范 (RedisService)

`RedisService` 的 `set` 和 `get` 方法已内置了 JSON 序列化与反序列化逻辑。

1. **自动序列化**: 直接传递 Object/Array 给 `set` 方法，无需手动调用 `JSON.stringify`。
2. **泛型支持**: 调用 `get` 方法时使用泛型指定返回类型，无需手动调用 `JSON.parse`。

**代码示例:**

```typescript
// ✅ 正确: 直接存储对象
const user = { id: '1', name: 'Alice' };
await this.redisService.set('user:lock', user);

// ✅ 正确: 使用泛型获取并自动转换
const cachedUser = await this.redisService.get<{ id: string; name: string }>(
  'user:lock',
);

// ❌ 错误: 手动序列化
await this.redisService.set('key', JSON.stringify(obj));
// ❌ 错误: 手动反序列化
const val = JSON.parse(await this.redisService.get('key'));
```

## 6. 统一响应与错误处理 (Response & Error)

### 统一响应体 (ApiResBody)

所有 API 响应（成功或失败）均由 `GlobalModule` 中的过滤器自动封装为统一格式。控制器方法**只需返回 DATA 部分**。

**结构示例：**

```json
{
  "code": 200,
  "message": "请求完成",
  "data": { ... },
  "fullUrl": "/api/v1/user",
  "method": "GET"
}
```

### 业务异常 (BizError)

在业务逻辑中，遇到预期内的错误（如余额不足、权限不够），应抛出 `BizError`。

- `BizError` 可以自定义业务状态码 (`code`) 和 HTTP 状态码 (`httpStatus`)。
- 默认 HTTP 状态码为 400，默认业务 Code 为 400。

**代码示例:**

```typescript
import { BizError } from '@libs/core/BizError';

if (balance < amount) {
  // 抛出业务异常，http状态码将被自动处理
  throw new BizError('余额不足')
    .codeAs(1001) // 自定义业务码
    .httpStatusAs(402); // 自定义 HTTP 状态码
}
```

## 7. 请求参数规范 (Request DTO)

使用 `class-validator` 和 `class-transform` 对请求参数进行更严格、更灵活的校验和转换。

### 常用技巧

1.  **Boolean 转换**: GET 请求的 Query 参数通常是字符串，使用 `@Transform` 转为布尔值。
2.  **嵌套对象校验**: 使用 `@Type` 和 `@ValidateNested` 校验复杂的嵌套 JSON 结构。

**代码示例 (UserDTO):**

```typescript
import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, ValidateNested, IsObject } from 'class-validator';

class MetaData {
  @IsNotEmpty({ message: '字段a不能为空' })
  a: string;
}

export class CreateUserDTO {
  @IsNotEmpty()
  name: string;

  // 1. Boolean 宽松转换 (处理 query param: "true", "1" 等)
  // 如果是 Query Param 推荐使用 Context7 的 ParseBoolGeneralPipe
  // 如果是 Body JSON，可以直接使用 Transform
  @Transform(({ value }) => Boolean(value))
  isActive: boolean;

  // 2. 嵌套对象校验
  @IsObject()
  @ValidateNested()
  @Type(() => MetaData) // 必须指定 Type 以便正确实例化
  metaData: MetaData;
}
```

### 7.2 范围查询规范 (Range Query)

对于需要支持起止时间或数值范围的查询接口，应遵循以下规范：

1.  **DTO 定义**: 使用 `@ParseRange()` (数值型) 或 `@ParseDateTimeRange()` (时间型) 装饰器。
2.  **参数接收**: 字段定义为可选的数组 `(string | number | null)[]`。
3.  **开区间支持**: 装饰器会自动处理逗号分隔的字符串（如 `,100` -> `[null, 100]`），前端传参时留空即代表开区间。

**代码示例 (DTO):**

```typescript
import { ParseDateTimeRange } from '@thomas/nestjs/core/nest/transform/ParseDateTimeRange.decorator';
import { ParseRange } from '@thomas/nestjs/core/nest/transform/ParseRange.decorator';

export class QueryDTO {
  @IsOptional()
  @ParseDateTimeRange()
  @IsArray()
  createTimeRange?: (string | null)[];

  @IsOptional()
  @ParseRange()
  @IsArray()
  priceRange?: (number | null)[];
}
```

**代码示例 (Service):**

在 Service 层处理时，根据数组元素是否存在来构建 SQL 的 `BETWEEN`、`>=` 或 `<=` 条件。

```typescript
if (createTimeRange && createTimeRange.length === 2) {
  const [start, end] = createTimeRange;
  if (start && end) {
    qb.andWhere('entity.createdAt BETWEEN :start AND :end', { start, end });
  } else if (start) {
    qb.andWhere('entity.createdAt >= :start', { start });
  } else if (end) {
    qb.andWhere('entity.createdAt <= :end', { end });
  }
}
```

## 8. 数据库实体规范 (BaseEntity)

libs/entities 提供了通用的基类，利用 TypeORM 的钩子自动处理 ID 和 时间戳。

- **`EntityWithId`**: 仅包含自动生成的 Snowflake ID (`id`).
- **`EntityWithIdAndTimeTrace`**: 包含 ID 以及自动维护的 `createdAt`, `updatedAt`.

**代码示例:**

```typescript
import { EntityWithIdAndTimeTrace } from '@libs/entities/base/WithIdAndTimeTrace';
import { Entity, Column } from 'typeorm';

@Entity()
export class Student extends EntityWithIdAndTimeTrace {
  @Column()
  name: string;

  // 无需定义 id, createdAt, updatedAt，基类会自动处理
}
```

## 9. 服务层范式 (Service Paradigm)

> **⚠️ strict rule**

**Service 层应保持上下文无关 (HTTP Protocol Agnostic)。**

- **DON'T**: 在 Service 中直接使用 `ThreadLocal` (ALS) 获取 HTTP 上下文。这会使 Service 与 HTTP 请求强耦合，难以复用（如用于 RPC、Cron Job）且难以测试。
- **DO**: 在 Controller 层获取所需的 Context 数据（如 `userId`, `tenantId`），显式传递给 Service 方法。

**反例 (Bad):**

```typescript
// Service
async doWork() {
  const store = this.threadLocal.getStore(); // 依赖 HTTP 上下文
  return this.repo.find({ where: { userId: store.account.id } });
}
```

**正例 (Good):**

```typescript
// Controller
@Post()
doWork() {
  const store = this.threadLocal.getStore();
  return this.service.doWork(store.account.id); // 显式传递
}

// Service
async doWork(userId: string) {
  return this.repo.find({ where: { userId } });
}

### 9.1 Service 参数类型規範

> **⚠️ strict rule**

**Service 方法参数应使用明确定义的 `interface` 或 `type`，而非直接引用 Controller 层的 DTO Class。**

1.  **解耦**: Service 不应依赖视图层/协议层的 DTO 定义。即使内容一致，也应在 Service 侧（或共享类型定义处）维护单独的 interface。
2.  **避免 Class 穿透**: 除非 Service 确实需要 DTO Class 特有的自动转换/校验能力（通常不建议，增加耦合），否则应使用普通的 TS 对象类型。
3.  **运行时校验**: Service 方法应对关键参数（如必填项、状态合法性）进行手动的运行时检查，并抛出 `BizError`，以保证业务逻辑的健壮性。
```

### 9.2 参数模式規範 (Parameter Pattern)

> **⚠️ strict rule**

**对于参数超过 3 个或逻辑复杂的私有/公有方法，必须使用对象参数（Object Parameter）形式。**

1.  **可读性**: 调用方可以清晰看到每个参数的含义，无需对应位置。
2.  **扩展性**: 增加可选参数时不会破坏方法签名。
3.  **维护性**: 结构清晰，便于解构赋值和类型定义。

**代码示例:**

```typescript
// ✅ 正确: 使用对象参数
private async syncEntities<T>(options: {
  repo: Repository<T>;
  sourceList: any[];
  uniqueKey: keyof T;
  mapper: (source: any) => Partial<T>;
  scope?: Partial<T>;
}) {
  const { repo, sourceList, uniqueKey, mapper, scope } = options;
  // ...
}

// 调用
await this.syncEntities({
  repo: this.userRepo,
  sourceList: list,
  uniqueKey: 'uid',
  mapper: (item) => ({ ... })
});

// ❌ 错误: 使用位置参数 (超过3个)
private async syncEntities(repo, sourceList, uniqueKey, mapper, scope) { ... }
```

## 10. 权限控制 (Permission & RBAC)

系统提供了基于角色(Role)的权限控制机制，支持医院端(`hospital_admin`)和运营端(`op_user`)。

### 核心机制

1.  **IdentityRequired**: 确定当前用户身份(Identity)。
2.  **PermissionGuard**: 根据身份获取对应角色，计算权限合集，挂载到 `ThreadLocal` 上下文，并校验权限。

### 使用方法

**1. 基础用法 (And 关系)**

```typescript
import { IdentityRequired } from '@libs/common/shared/guards/identity-required/identity-required.decorator';
import { PermissionRequired } from '@libs/common/shared/guards/permission/permission-required.decorator';
import { PermissionGuard } from '@libs/common/shared/guards/permission/permission.guard';

@Controller('users')
// 1. 必须先应用 IdentityRequired (或 Ensure Identity Exists)
// 2. 使用 PermissionGuard
@UseGuards(PermissionGuard)
export class UserController {

  @Post()
  @IdentityRequired('hospital_admin')
  //以此装饰器声明所需权限 code
  @PermissionRequired('user.create')
  create() { ... }

  @Delete()
  @IdentityRequired('hospital_admin')
  // 数组表示 AND 关系 (必须同时拥有)
  @PermissionRequired(['user.delete', 'user.view'])
  remove() { ... }
}
```

**2. 复杂逻辑 (Or 关系)**

```typescript
// 数组嵌套数组表示 OR 关系
// 下例表示: (拥有 user.update) OR (拥有 user.admin)
@PermissionRequired([['user.update'], ['user.admin']])
```

**3. 自定义函数**

```typescript
@PermissionRequired((list) => {
    // list: 权限码列表 ['user.create']
    return list.includes('super_mode') || list.includes('user.admin');
})
```

### 权限获取 (ThreadLocal)

可以在 Service 中通过 `ThreadLocal` 获取当前用户的权限列表：

```
const permissions = this.threadLocal.get('permissions');
```

### 超级管理员

- `HospitalAdmin` 的 `isSuperAdmin` 为 true 时, 应检查是否在医院所允许的最大权限内
- `OpUser` 的 `isSuper` 为 true 时,跳过所有权限检查。

## 11. 分页与 RESTful 接口规范

> **⚠️ strict rule**

### 11.1 分页接口规范

**1. 统一返回类型**  
所有分页接口必须使用 `IPageData<T>` 作为返回类型:

```typescript
import { IPageData } from '@thomas/nestjs/core/Pagination';

// IPageData 接口定义
interface IPageData<T> {
  rows: T[]; // 列表数据
  total: number; // 总数
  page: number; // 当前页码
  pageSize: number; // 每页数量
}
```

**2. 分页参数统一使用 PaginationDTO**  
Controller 层使用 `PaginationDTO` 获取分页参数:

```typescript
import { PaginationDTO } from '@thomas/nestjs/core/Pagination';

// PaginationDTO 定义
class PaginationDTO {
  page: number = 1; // 默认第1页
  pageSize: number = 10; // 默认每页10条
}
```

**3. 方法命名规范**  
分页查询的 Service 方法名称必须包含 `Page` (而非 `List`):

```typescript
// ✅ 正确
async findAccountPage(...)
async getUserPage(...)

// ❌ 错误
async findAccountList(...)
async getUserList(...)
```

**4. Service 方法签名**  
Service 方法应单独接收分页参数,不要从 Controller 穿透整个 DTO:

```typescript
// ✅ 正确: 分页参数单独传递
async findAccountPage(
  queryDto: AccountQueryDTO,  // 业务过滤条件
  page: number,               // 页码
  pageSize: number,           // 每页数量
): Promise<IPageData<Account>>

// ❌ 错误: 将 Controller 的完整 DTO 穿透到 Service
async findAccountPage(
  combinedDto: AccountWithPaginationDTO // 包含了业务和分页参数
): Promise<IPageData<Account>>
```

**完整示例:**

```typescript
// DTO 定义 (仅包含业务过滤条件)
export class AccountQueryDTO {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

// Controller
@Get('page')
async findAccountPage(
  @Query() queryDto: AccountQueryDTO,
  @Query() pagination: PaginationDTO,
): Promise<ApiResBody<IPageData<OpAccount>>> {
  const result = await this.accountService.findAccountPage(
    queryDto,
    pagination.page,
    pagination.pageSize,
  );
  return ApiResBody.of(result);
}

// Service
async findAccountPage(
  queryDto: AccountQueryDTO,
  page: number,
  pageSize: number,
): Promise<IPageData<OpAccount>> {
  const { username, phone } = queryDto;

  const qb = this.accountRepository.createQueryBuilder('account');

  if (username) {
    qb.andWhere('account.username LIKE :username', {
      username: `%${username}%`
    });
  }

  const [rows, total] = await qb
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getManyAndCount();

  return { rows, total, page, pageSize };
}
```

### 11.2 RESTful 风格规范

**1. 禁止使用 Path 参数定位资源**  
需要使用 ID 等标识定位资源时,**必须使用 Query 参数**:

```typescript
// ✅ 正确: 使用 Query 参数
@Patch()
async updateAccount(
  @Query('id') id: string,
  @Body() updateDto: UpdateAccountDTO,
) { ... }

// DELETE /account-manage?id=123
@Delete()
async deleteAccount(@Query('id') id: string) { ... }

// GET /account-manage/detail?id=123
@Get('detail')
async getDetail(@Query('id') id: string) { ... }

// ❌ 错误: 使用 Path 参数
@Patch(':id')
async updateAccount(
  @Param('id') id: string,
  @Body() updateDto: UpdateAccountDTO,
) { ... }
```

**2. 修改接口的对象标识规范**  
修改对象的接口 **禁止在 DTO 中携带对象标识** (如 `id`),即使携带了也不能作为对象标识使用。**必须以 Query 参数提供的 ID 为准**:

```typescript
// ✅ 正确: ID 从 Query 参数获取
export class UpdateAccountDTO {
  // 不包含 id 字段
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

@Patch()
async updateAccount(
  @Query('id') id: string,        // ID 从这里获取
  @Body() updateDto: UpdateAccountDTO,
) {
  // 使用 Query 参数的 id,不使用 dto 中的 id (即使有)
  return this.service.updateAccount(id, updateDto);
}

// ❌ 错误: DTO 中包含 id
export class UpdateAccountDTO {
  id: string;  // 不应该在这里定义
  nickname?: string;
}
```

- 职责分离: URL 负责定位资源,Body 负责提供修改内容

**3. 更新类接口返回规范**  
所有执行更新操作的接口 (PATCH/PUT), 在更新完成后**必须返回更新后的完整对象** (Data 包含该对象), 而非返回 null。这有助于前端直接更新应用状态而无需重新请求详情。

## 12. 代码质量与类型安全 (Quality & Type Safety)

### 12.1 严禁随意断言为 any

> **⚠️ strict rule**

在实现业务逻辑时，禁止为了规避编译器检查而随意将变量断言为 `any`，每次实现后需要校验eslint和ts校验是否通过。

**规范要求：**

1.  **优先寻找/定义接口**：即使是复杂结构，也应寻找原有的 Entity 类型或定义 DTO/Type 接口。
2.  **ALS 上下文取值**：从 `ThreadLocal` 获取数据时，应显式断言为正确的 Store 类型或对应的属性类型。
3.  **兜底处理**：如果确实因框架原因返回 `any`（如原生的 ALS 工具类），应在取值的第一时间断言为正确的目标类型。

**反例 (Bad):**

```typescript
const identity = this.threadLocal.get('identity') as any; // 随意断言为 any
const hospitalId = identity.hospitalAdmin.hospitalId; // 失去类型保护
```

**正例 (Good):**

```typescript
import { AccountIdentity } from '@thomas/nestjs/entities/account/account-identity.entity';

// 在业务代码第一层显式断言为具体类型
const identity = this.threadLocal.get('identity') as AccountIdentity;
const hospitalId = identity?.hospitalAdmin?.hospitalId; // 享有完备补全和安全性
```

### 12.2 敏感信息更新规范

> **⚠️ strict rule**

**密码等敏感信息必须与基础业务信息更新解耦。**

1.  **独立接口**：严禁在维护业务对象（如管理员、学生）的基础信息更新接口中包含密码修改逻辑。
2.  **独立 Service 方法**：Service 层应提供独立的 `updatePassword` 类似方法，严禁在 `manageXxx` 等综合维护方法中处理密码更新。
3.  **安全性**：密码更新操作通常需要额外的验证逻辑（如校验旧密码或高权限验证）。

---

### 11.5 分页 (Page) 与 列表 (List) 的区别

工程中严格区分“分页”和“列表”接口：

- **分页 (Page)**: 用于数据量较大的场景。使用 `PaginationDTO` 接收参数（`page`, `pageSize`），返回 `IPageData<T>`。
- **列表 (List)**: 用于数据量可控的场景（如管理后台的基础配置列表）。使用继承自 `ListLimitDto` 的 DTO 接收参数（`limit` 等），返回 `IListData<T>`。

**原则：分页是分页，列表是列表。同一个资源如果同时提供这两种接口，应分别命名为 `/page` 和 `/list`。**

---

### 11.3 列表 (List) 接口规范

**1. 基础查询与 Limit**
所有 `list` 类接口（非分页）应支持基础过滤查询，并且必须提供 `limit` 参数以限制返回条数。
控制器上对应的 DTO 必须继承自 `ListLimitDto` (位于 `@thomas/nestjs/core/Pagination`)。
`limit` 在 `ListLimitDto` 中默认为 10。

**2. 统一返回类型**
推荐使用 `IListData<T>` 作为非分页列表的返回格式。

**3. 参数命名规范**
当接口 URL 尾部表示子资源时（例如 `/role/admins`），定位父资源的参数名应具名（如 `roleId`），而不是通用的 `id`。

```typescript
// ✅ 正确: 使用 ListLimitDto 继承并具名参数
export class RoleQueryDTO extends ListLimitDto { ... }

@Get('admins')
async listAdmins(@Query() query: RoleAdminQueryDTO) { ... }
```

### 11.4 简单列表 (Simple List) 接口规范

对于仅需要返回对象基本信息（如 ID 和名称）供下拉选择或简单展示的场景，应提供 `simple-list` 接口。

1.  **接口命名**: `GET /.../simple-list`
2.  **返回结构**: 包含 `id` 和 `name` (或 `label`) 的扁平对象数组。
    - 对于实体，直接返回 `id` 和 `name`。
3.  **查询参数**: 通常仅支持 `limit` 或基本的关键词过滤。
4.  **用途**: 前端 Select 组件、简单的级联展示等。

```typescript
export class SimpleItemDTO {
  id: string;
  name: string;
}
```

## 13. 数据范围权限规范 (Data Scope Permissions)

为了实现灵活的数据隔离（如：仅本人可见、本部门可见、部门及下属部门可见、全院可见），工程集成了通用的数据范围过滤机制。

### 13.1 实体定义 (Entity Definition)

实体需通过 `WithScopeStrategy` Mixin 增加数据范围控制字段。

**Mixins 组合建议：**

- 使用 `WithScopeStrategy` 会添加 `scope_strategy`, `scope_dept_id`, `scope_creator_id` 字段。
- 通常建议与 `WithAuditor` 配合使用（以便自动追踪创建人）。

**代码示例:**

```typescript
import {
  WithScopeStrategy,
  EntityWithIdAndTimeTrace,
} from '@libs/entities/base/extendable';

@Entity()
export class CustomSubject extends WithScopeStrategy(EntityWithIdAndTimeTrace) {
  @Column()
  name: string;
  // ... 其他业务字段
}
```

### 13.2 控制策略 (ScopeStrategy)

支持以下策略（枚举值定义在 `@libs/entities/base/extendable`）：

- `ALL`: **全局可见**。没有任何额外过滤条件。
- `SELF`: **仅个人可见**。仅当 `scope_creator_id` 等于当前用户 ID 时可见。
- `DEPT_ONLY`: **仅本部门可见**。仅当 `scope_dept_id` 等于当前用户部门 ID 时可见。
- `DEPT_AND_CHILDREN`: **本部门及下属部门可见**。利用部门闭包表 (`dept_closure`) 校验记录的 `scope_dept_id` 是否为用户所在部门或其子部门。

> **💡 兜底规则**：无论采用哪种策略，记录的**创建者**（`scope_creator_id`）永远对该记录可见。

### 13.3 服务层使用 (Service Usage)

在 Service 中利用 `DataScopeEngine` 将过滤逻辑应用到 `QueryBuilder`。

**开发规范：**

1.  **显式传递上下文**：Service 方法应接收当前用户的 `id` 和 `deptId` 作为 `searcher`。
2.  **调用 apply 方法**：在构建好基础 `QueryBuilder` 后，调用 `dataScopeEngine.apply({ qb, searcher })`。

**代码示例:**

```typescript
@Injectable()
export class CustomQuestionBankSharedService {
  constructor(
    private readonly dataScopeEngine: DataScopeEngine,
    @InjectRepository(CustomSubject)
    private readonly repo: Repository<CustomSubject>,
  ) {}

  async getSubjectPage(
    hospitalId: string,
    user: { id: string; deptId: string },
    page: number,
    pageSize: number,
  ) {
    const qb = this.repo
      .createQueryBuilder('e')
      .where('e.hospitalId = :hospitalId', { hospitalId });

    // 应用通用的数据范围过滤逻辑
    this.dataScopeEngine.apply({
      qb,
      searcher: {
        id: user.id,
        deptId: user.deptId,
      },
    });

    const [rows, total] = await qb
      .orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { rows, total, page, pageSize };
  }
}
```

## 14. 文件上传与管理规范 (File Management & Upload)

本工程提供了一套完整的文件管理机制，支持本地文件存储、数据库元数据追踪以及缓存优化。

### 14.1 核心服务

- **`FileService`**: 位于 `@thomas/nestjs/core/nest/file-management`，是文件管理系统的核心。
  - **元数据追踪**: 记录文件在数据库（`sys_file`）中的元数据（文件名、MIME、大小、存储 ID `object` 等）。
  - **ID 翻译 (`translateIds`)**: **(推荐用法)** 批量将文件 ID 翻译为完整的实体对象。利用 Redis 缓存（`file:translate:map`）优化，极大减少频繁查询数据库的压力。
  - **审计支持**: 支持追踪文件的上传者类型（`authorType`）和上传人 ID（`createdBy`）。
- **`LocalUploadService`**: 继承或协同 `FileService`，专门负责本工程目前主要使用的本地文件上传逻辑。
  - 处理物理文件在磁盘上的保存（自动递归创建子目录）。
  - 自动生成文件的 Web 访问路径 (`fullUrl`)。
  - 调用 `FileService` 将文件信息持久化到数据库。

### 14.2 文件上传流程

在 Controller 中，应使用 `LocalUploadService` 来处理本地上传。

**关键步骤：**

1.  **路径规划**: 根据业务逻辑确定 `object` 路径（建议携带业务前缀、日期或唯一 ID）。
2.  **调用上传**: 传入文件流和 object 路径。

**代码示例:**

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async upload(@UploadedFile() file: Express.Multer.File) {
  // 1. 从 ThreadLocal 获取当前用户标识
  const identity = this.threadLocal.getStore()?.identity;

  // 2. 构造存储路径 (Object)
  const object = `avatars/${identity.id}/${Date.now()}_${file.originalname}`;

  // 3. 执行物理保存并获取数据库记录
  const record = await this.localUploadService.saveLocalFile(
    file,
    object,
    identity.identityType, // 自动追踪上传者身份
    identity.id
  );

  return ApiResBody.of(record);
}
```

### 14.3 ID 翻译与展示的最佳实践

由于业务表中通常只存储文件的 ID（字符串或逗号分割的字符串数组），在返回详情给前端时，应调用 `FileService` 进行翻译，以便前端能直接拿到 `fullUrl`。

**代码示例:**

```typescript
async getDetail(id: string) {
  const entity = await this.repo.findOne(id);

  // 假定 entity.attachments 存储了 ID 逗号分割字符串
  const fileIds = entity.attachments ? entity.attachments.split(',') : [];

  // 批量翻译 ID 为实体数组 (优先从缓存获取)
  const files = await this.fileService.translateIds(fileIds);

  return { ...entity, files };
}
```

### 14.4 存储路径预设

为了保持服务器存储空间的整洁，建议遵循以下预设路径规则（详见 `docs/development/business-file-paths.md`）：

- **账号头像**: `/{username}/avatar/{timestamp}_{filename}`
- **医院 Logo**: `/{uscCode}/logo/{timestamp}_{filename}`
- **业务附件**: `/{uscCode}/attachments/{type}/{timestamp}_{filename}`

### 14.5 配置项

本地存储配置通过 `ConfigService` 获取，默认值如下：

- `file.local.storageRoot`: `./uploads`（物理根目录）
- `file.local.serveRoot`: `/files`（访问 URL 前缀）
