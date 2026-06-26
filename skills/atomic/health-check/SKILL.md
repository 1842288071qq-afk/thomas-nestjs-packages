---
name: health-check
description: 进程健康监测 HealthModule — imports HealthModule.forRoot() 即暴露 /health(liveness) 与 /health/ready(readiness)；业务用 @HealthIndicator 实现 HealthCheck 自动汇入 readiness。
type: atomic
tags: [health, ops, readiness, liveness]
when_to_use: 关键词 — health, 健康检查, liveness, readiness, HealthModule, HealthIndicator, /health, 探活, 就绪
---


# 进程健康监测 (HealthModule)

公共能力 `libs/core/src/nest/health/`。根 Module `imports: [HealthModule.forRoot()]` 即自动暴露两个接口，零业务侵入。**不要自己造健康接口。**

| 接口 | 用途 | 行为 |
|------|------|------|
| `GET /health`（liveness） | 进程存活/事件循环 | 极轻量，不碰 DB，返回 `{status, app, pid, uptimeSec}`，可公网探活 |
| `GET /health/ready`（readiness） | 依赖与业务是否可服务 | 跑全部检查（数据源/Redis/业务 hook），每项独立超时，结果短 TTL 缓存。`up`→200，`degraded`/`down`→503 |

内置检查：进程元信息、所有 TypeORM `DataSource`（`SELECT 1`）、可选 Redis（PING）。

## 业务扩展 hook（核心）

写一个 provider 实现 `HealthCheck` 并标注 `@HealthIndicator()`，放进任意 Module 的 providers，**DiscoveryService 自动发现并汇入** readiness，无需改公共模块：

```typescript
@Injectable()
@HealthIndicator()
export class QuestionBankHealth implements HealthCheck {
  readonly name = 'question-bank';   // checks 字典键，稳定唯一
  readonly critical = true;          // 关键项：down 则整体 down（非 critical 仅 degraded）
  constructor(@InjectDataSource() private readonly ds: DataSource) {}
  async check(): Promise<HealthCheckResult> {
    const rows = await this.ds.query('SELECT count(*) AS c FROM question_stat');
    return { status: 'up', detail: { total: Number(rows[0].c) } };
  }
}
```

每个检查 `Promise.race([check(), timeout])`，卡死的查询只判 `down`（`error:'timeout'`），不拖垮接口。

## 配置（env）

```
APP_HEALTH_ENABLED=true          # 总开关，默认 true；false 时接口 404
APP_HEALTH_TOKEN=                # 详情令牌；非空则 /health/ready 需 X-Health-Token 头或 ?token=
APP_HEALTH_CACHE_TTL_MS=3000     # readiness 结果缓存
APP_HEALTH_CHECK_TIMEOUT_MS=2500 # 单检查硬超时
```

## 注意

- 路径固定 `/health`、`/health/ready`（静态元数据）。带全局前缀的 app 在 `setGlobalPrefix(prefix, { exclude: ['health', 'health/ready'] })` 中排除以保证路径稳定。
- liveness 只回最小信息可公开；readiness 详情受 token / nginx IP 白名单保护，**绝不**回连接串/密码/SQL 明文。
- 接口标 `@Public` 跳过 JWT，保护交给 token/IP。

## 相关 skill

- `app-module-composition` — HealthModule.forRoot() 接入位置
- `app-bootstrap-main` — setGlobalPrefix 的 health 路径排除

详见 `docs/development/health-check.md`。
