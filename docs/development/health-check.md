# 进程健康监测（HealthModule）设计方案

> 公共能力，位于 `libs/core/src/nest/health/`，通过 `@qyy-code-lego/nestjs/core` 导出。
> 应用根 Module `imports: [HealthModule.forRoot()]` 即自动获得健康接口，零业务侵入。
> 本文档保留本次调研与选型，后续如需调整以此为基线。

## 1. 背景与目标

生产以 docker compose 运行多进程后端，曾出现「拼单等突发流量 → 单实例事件循环/查询卡死 → 所有 API 无响应」。需要**每个进程自带健康接口**用于探活、就绪判定与告警，并能让业务方挂载自己的关键健康判据（如题库统计查询是否还能跑通）。

设计目标：

- 接入即用：引用模块即自动暴露接口，返回通用进程/数据源健康信息。
- 健康信息对象**可扩展**：内置项 + 业务 hook 注入项统一汇入开放字典。
- **hook 式扩展**：业务方加一个 provider 即自动汇入，不改公共模块。
- 抗卡死：每个检查独立超时，卡死的查询只会被判 `down`，不拖垮健康接口本身。
- 安全：详情不公开裸奔。

## 2. 选型决策（已确认）

| 维度 | 决策 | 理由 |
|------|------|------|
| 实现底座 | **自研轻量版**（不用 @nestjs/terminus） | 完全控制响应结构与发现 hook，无额外依赖，贴合「可扩展健康对象」诉求 |
| 扩展机制 | **DiscoveryService + `@HealthIndicator()` 自动发现** | 业务方只加 provider 即自动汇入，零连线，最像 hook |
| 接口保护 | **两层：公开极简 liveness + 令牌保护 readiness 详情** | 既能公网探活又不泄露依赖细节 |

## 3. 接口设计：liveness / readiness 分离

刻意分两个接口，对应两类故障：

| 接口 | 用途 | 行为 | 覆盖故障 |
|------|------|------|---------|
| `GET /health`（liveness） | 进程存活、事件循环是否还在转 | 极轻量，**不碰 DB**，立即返回最小信息 | 事件循环被阻塞（拼单卡死）→ 此接口都超时 → 外部监控判 down 重启 |
| `GET /health/ready`（readiness） | 依赖与业务是否可服务 | 跑全部检查（数据源/Redis/业务 hook），每项带超时；结果短 TTL 缓存 | 查询卡死但进程还在 → 对应检查超时 → 报 down → nginx/监控摘除 |

- `ready` 健康返回 **200**，`degraded`/`down` 返回 **503**，便于按状态码自动判定。
- `live` 永远尽量返回 200（只要事件循环还能调度到它）。

## 4. 健康信息对象（响应结构）

```json
{
  "status": "up | degraded | down",
  "app": "ai-apex-pass-client",
  "pid": 12345,
  "host": "prod-1",
  "port": 4002,
  "uptimeSec": 3600,
  "timestamp": "2026-06-21T08:00:00.000Z",
  "checks": {
    "datasource:default": { "status": "up", "durationMs": 3 },
    "redis":              { "status": "up", "durationMs": 1 },
    "question-bank":      { "status": "up", "durationMs": 12, "detail": { "total": 480123 } }
  }
}
```

- `checks` 为开放字典；每项 `HealthCheckResult = { status, durationMs?, detail?, error? }`，`detail` 任意扩展。
- 整体 `status` 聚合规则：任一 `critical` 检查 `down` → 整体 `down`；仅非 `critical` 异常 → `degraded`；全通过 → `up`。

## 5. 内置通用检查

- **进程元信息**：app 名、pid、host、port、uptime、内存（rss/heapUsed）。
- **数据源**：用 DiscoveryService 发现容器内所有 TypeORM `DataSource`，逐个 `SELECT 1`，报 `isInitialized` 与延迟。命名为 `datasource:<name>`。
- **Redis**（可选）：若进程注册了 RedisModule，则 `PING` + 延迟；未注册则跳过（用 `ModuleRef` 宽松解析，解析不到不报错）。

## 6. 业务扩展 hook（核心）

业务方写一个 provider 实现 `HealthCheck` 接口并标注 `@HealthIndicator()`，**自动被发现并汇入** `checks`：

```ts
@Injectable()
@HealthIndicator()
export class QuestionBankHealth implements HealthCheck {
  readonly name = 'question-bank';
  readonly critical = true; // 关键业务：失败则整体 down

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async check(): Promise<HealthCheckResult> {
    const rows = await this.ds.query('SELECT count(*) AS c FROM question_stat /* ... */');
    return { status: 'up', detail: { total: Number(rows[0].c) } };
  }
}
```

把它放进该 app 的某个 Module providers 即可，HealthModule 自动发现，无需改动公共模块。

### 抗卡死：每检查独立超时

聚合器对每个检查 `Promise.race([check(), timeout(APP_HEALTH_CHECK_TIMEOUT_MS)])`：卡死的查询超时即判 `down`（`error: 'timeout'`），不会让健康接口本身挂起。这正是「接口全部查询卡死」场景的探针。

### 防雪崩：readiness 结果缓存

`ready` 结果按 `APP_HEALTH_CACHE_TTL_MS`（默认 3s）缓存，并对并发请求做 in-flight 去重，避免高频探测/被刷时每次都打 DB。

## 7. 配置（env）

```
APP_HEALTH_ENABLED=true          # 总开关，默认 true；false 时接口返回 404
APP_HEALTH_TOKEN=                # 详情令牌；非空则 readiness 需校验，空则依赖 nginx IP 限制
APP_HEALTH_CACHE_TTL_MS=3000     # readiness 结果缓存
APP_HEALTH_CHECK_TIMEOUT_MS=2500 # 单个检查超时
```

由 `resolveAppHealthConfig`（`libs/common/src/config/app.config.ts`）解析进 `AppConfig.health`，HealthModule 运行时从 `ConfigService` 读取（`enabled` 在请求时判定，故 `.env` 文件配置也即时生效）。

> 路径固定为 `/health` 与 `/health/ready`（NestJS `@Controller` 路径为静态元数据，不随 env 变化）。带全局前缀的 app（client/admin）在 `setGlobalPrefix(prefix, { exclude: ['health', 'health/ready'] })` 中排除，保证路径稳定。

## 8. 安全设计

1. **两层暴露**：`/health` 仅回 `{status, app, pid, uptimeSec}`（无依赖细节），可公网探活；`/health/ready` 完整 `checks` 受保护。
2. **令牌**：`APP_HEALTH_TOKEN` 非空时，readiness 需 `X-Health-Token` 头或 `?token=` 匹配（`HealthTokenGuard`）；为空则放行（交给 nginx IP 白名单）。
3. **nginx IP 白名单**：`location /health/ready` 仅 `allow` 监控/内网，`deny all`。
4. **不泄露敏感信息**：只回状态/延迟/计数，**永不**含连接串、密码、SQL 明文。
5. **免鉴权但不免保护**：接口标 `@Public` 跳过 JWT，保护由 token/IP 承担。
6. **全局前缀排除**：`setGlobalPrefix(prefix, { exclude: [...] })` 让 `/health*` 不挂到 `api/client` 等前缀下，路径稳定。

## 9. 模块结构

```
libs/core/src/nest/health/
├── health.types.ts            # HealthStatus / HealthCheckResult / HealthCheck / HealthReport / 配置
├── health.constants.ts        # 装饰器元数据键、默认值、token header 名
├── health-indicator.decorator.ts  # @HealthIndicator() 标记（供 DiscoveryService 发现）
├── health.service.ts          # 聚合：发现 indicators + 内置检查 + 超时 + 缓存
├── health.controller.ts       # GET /health（liveness）/ GET /health/ready（readiness）
├── health-token.guard.ts      # readiness 令牌校验
├── health.module.ts           # forRoot()：DiscoveryModule + service + controller + guard
└── index.ts
```

## 10. 配套（可选，后续）

外部看门狗（systemd timer / cron）定时 curl 各 client 的 `/health/ready`，连续 `down` 则 `docker compose restart` 该实例，弥补 nginx OSS 无主动健康检查。与现有 nginx 被动失败转移（`max_fails`）互补。

## 11. 边界与已知限制

- liveness 反映事件循环健康——若进程完全卡死，liveness 也不会响应，这是预期（据此触发重启）。
- 数据源发现依赖 DiscoveryService 能枚举到 `DataSource` 实例；自定义数据源若未走容器 provider 注册需手动补充 indicator。
- 缓存使 readiness 有最长 `CACHE_TTL_MS` 的状态滞后，换取抗压；告警阈值需考虑这一延迟。
