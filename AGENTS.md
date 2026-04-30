<!-- thomas-nestjs-skills:start -->

## thomas NestJS Skills

> 本节由 `skills/bin/install-skills.mjs` 维护，请勿手工编辑。
> Skill 源：[thomas-nestjs](./.tmp-codex-skills/thomas/)

### 元 Skill (atomic)

- **app-bootstrap-main** — app 的 main.ts 推荐写法 — 从 AppConfig 取 port/host/apiPrefix/logger 启动 HTTP，connectGlobalGuards 注入全局守卫，apiPrefix 可选。 (`./.tmp-codex-skills/thomas/atomic/app-bootstrap-main.md`)
- **app-module-composition** — app 根 Module 必备组合 — configModuleImport 加载配置、applyTypeOrmDs 注册数据源、GlobalModule、CoreEntityFeatureModule、AccountDeserializeModule、IdentityRequiredModule、PermissionModule、RedisModule、JwtAuthModule.forRoot()。 (`./.tmp-codex-skills/thomas/atomic/app-module-composition.md`)
- **auth-identity-public** — 用 @IdentityRequired 限定接口可访问身份（student/hospital_admin/op 等），用 @Public 或 jwt.whiteList 跳过 JWT 认证。 (`./.tmp-codex-skills/thomas/atomic/auth-identity-public.md`)
- **biz-error** — 业务预期错误（余额不足、状态不合法等）必须抛 BizError，可链式 codeAs/httpStatusAs 自定义业务码与 HTTP 状态。 (`./.tmp-codex-skills/thomas/atomic/biz-error.md`)
- **cache-wrap** — 用 CacheService.wrap 自动完成「查缓存 → miss 回源 → 写缓存 → 返回」流程，防止缓存击穿；支持 unless 条件不缓存。 (`./.tmp-codex-skills/thomas/atomic/cache-wrap.md`)
- **config-namespaces** — 配置通过 declare global 的 AllConfig 接口定义命名空间类型；内置 app/session/datasource/file/questionBank；扩展时 declare 同名 interface 合并；使用 ConfigService<AllConfig> 获得类型安全访问。 (`./.tmp-codex-skills/thomas/atomic/config-namespaces.md`)
- **config-service** — 通过 NestJS 原生 ConfigService 读取 yaml 配置，支持点路径取嵌套字段和默认值。 (`./.tmp-codex-skills/thomas/atomic/config-service.md`)
- **context-threadlocal** — 通过 ThreadLocal(ALS) 在请求生命周期内获取 account/identity/requestId 等上下文；仅 Controller/Guard/Interceptor 层使用，Service 层禁止。 (`./.tmp-codex-skills/thomas/atomic/context-threadlocal.md`)
- **data-scope** — 通过 WithScopeStrategy Mixin 给实体加数据范围字段，Service 用 DataScopeEngine.apply 实现 SELF/DEPT_ONLY/DEPT_AND_CHILDREN/ALL 行级过滤。 (`./.tmp-codex-skills/thomas/atomic/data-scope.md`)
- **dto-validation** — 用 class-validator/class-transformer 校验请求 DTO；时间字段必须 @ToDate，布尔字段用 parseBooleanGeneral，非空字符串用 @EnsureNotBlank，嵌套对象用 @Type+@ValidateNested。 (`./.tmp-codex-skills/thomas/atomic/dto-validation.md`)
- **entity-base** — TypeORM 实体必须继承 EntityWithId 或 EntityWithIdAndTimeTrace，自动获得 Snowflake ID 与 createdAt/updatedAt；可叠加 WithScopeStrategy/WithAuditor 等 Mixin。 (`./.tmp-codex-skills/thomas/atomic/entity-base.md`)
- **env-config-conventions** — env 文件按工程根目录 env/{appName}.env 命名，{appName}.local 优先覆盖；变量按模块前缀分组（PORT/APP_/DATABASE_/REDIS_/JWT_/KAFKA_/RABBIT_）；必须维护 .env.example 同步。 (`./.tmp-codex-skills/thomas/atomic/env-config-conventions.md`)
- **file-management** — 文件上传用 LocalUploadService.saveLocalFile，自动落盘并写 sys_file 元数据；接口返回时用 FileService.translateIds 批量把文件 ID 翻译为带 fullUrl 的实体（带 Redis 缓存）。 (`./.tmp-codex-skills/thomas/atomic/file-management.md`)
- **pagination-and-list** — 分页用 PaginationDTO+IPageData，Service 方法名含 Page；列表用 ListLimitDto+IListData；简单下拉用 simple-list 返回 id+name；分页与列表严格区分接口。 (`./.tmp-codex-skills/thomas/atomic/pagination-and-list.md`)
- **permission-rbac** — 基于 @PermissionRequired + PermissionGuard 实现 RBAC 权限码校验，支持 AND/OR/自定义函数；超管跳过校验。 (`./.tmp-codex-skills/thomas/atomic/permission-rbac.md`)
- **range-query** — 范围查询 DTO 字段必须用 @ParseRange / @ParseDateTimeRange；声明为可选数组，开区间通过留空的逗号分隔字符串支持。Service 按数组元素是否存在拼 BETWEEN/>=/<=。 (`./.tmp-codex-skills/thomas/atomic/range-query.md`)
- **redis-kv** — RedisService.set/get 已内置 JSON 序列化，禁止手动 JSON.stringify/parse；get 用泛型指定返回类型。 (`./.tmp-codex-skills/thomas/atomic/redis-kv.md`)
- **response-apiresbody** — API 响应统一为 ApiResBody 结构，由全局 CatchEverythingFilter 自动封装；Controller 只返回 data 部分，必要时用 ApiResBody.of 显式包裹。 (`./.tmp-codex-skills/thomas/atomic/response-apiresbody.md`)
- **restful-style** — 禁止用 Path 参数定位资源，ID 一律 Query 传；修改类 DTO 不携带 id（即便有也不使用）；PATCH/PUT 必须返回更新后的完整对象，不返回 null。 (`./.tmp-codex-skills/thomas/atomic/restful-style.md`)
- **serialization-vo** — 全局 ClassSerializeInterceptor 按类装饰器序列化；接口返回默认用 VO（@Exclude/@Expose/@Transform），通过模块内 vo-transform 把 Service DTO 转 VO；Service 不依赖 vo-transform。 (`./.tmp-codex-skills/thomas/atomic/serialization-vo.md`)
- **service-paradigm** — Service 层四条强约束 — 上下文无关（禁用 ThreadLocal）、参数用 interface 而非 DTO Class、超过 3 个参数用对象参数、查询分层（返回实体聚合，不构造展示态）。 (`./.tmp-codex-skills/thomas/atomic/service-paradigm.md`)
- **type-safety** — 禁止随意 as any 绕过编译；ALS 取值应在第一时间显式断言为业务实体类型；密码等敏感信息更新必须独立接口与独立 Service 方法，不混入综合维护接口。 (`./.tmp-codex-skills/thomas/atomic/type-safety.md`)

### 任务级 Skill (composite)

- **create-new-app** — 在 monorepo 内新增一个 app 的全流程 — 注册 nest-cli.json、建 tsconfig.app.json、创建 main.ts/根 Module/config/datasource.config.ts/mq.config.ts、env/{appName}.env(.example)、PORT 与 REDIS_KEY_PREFIX 命名空间。 (`./.tmp-codex-skills/thomas/composite/create-new-app.md`)
- **design-api-doc** — 接口文档放在工程 docs/api-schema/，按模块拆分；记录路径、方法、Query/Body 字段、返回 VO 结构、错误码、权限要求；接口结构调整后必须同步更新。 (`./.tmp-codex-skills/thomas/composite/design-api-doc.md`)
- **design-database-entity** — 设计数据库实体 — 继承 EntityWithIdAndTimeTrace 自动获得 Snowflake ID 与时间戳；行级权限叠 WithScopeStrategy；审计叠 WithAuditor；命名/索引/关系约定。 (`./.tmp-codex-skills/thomas/composite/design-database-entity.md`)
- **design-sql-query** — 设计 TypeORM 查询/SQL — 优先 leftJoinAndSelect 拿关系数据，范围条件按 ParseRange 解析结果拼 BETWEEN/>=/<=，行级权限 dataScopeEngine.apply，分页用 skip+take+getManyAndCount。 (`./.tmp-codex-skills/thomas/composite/design-sql-query.md`)
- **implement-controller** — 实现一个 NestJS Controller 的标准流程 — 身份/权限装饰器、DTO 校验、RESTful 路径与参数、ApiResBody 返回类型、VO 转换、分页/列表区分。 (`./.tmp-codex-skills/thomas/composite/implement-controller.md`)
- **implement-file-upload** — 实现文件上传接口 — FileInterceptor 接收 multipart，组合存储路径，调用 LocalUploadService.saveLocalFile 持久化；详情接口 FileService.translateIds 翻译 ID。 (`./.tmp-codex-skills/thomas/composite/implement-file-upload.md`)
- **implement-service** — 实现 NestJS Service 的标准流程 — 上下文无关、interface 入参、对象参数、查询分层、缓存包裹、BizError 抛错、数据范围注入。 (`./.tmp-codex-skills/thomas/composite/implement-service.md`)
- **organize-nestjs-module** — NestJS 业务模块的目录组织 — dto/、vo/、{module}.controller.ts、{module}.service.ts、{module}.vo-transform.ts；Service 不依赖 vo-transform。 (`./.tmp-codex-skills/thomas/composite/organize-nestjs-module.md`)

<!-- thomas-nestjs-skills:end -->
