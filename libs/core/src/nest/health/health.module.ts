import { DynamicModule, Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { HealthTokenGuard } from './health-token.guard';

/**
 * 进程健康监测模块。应用根 Module `imports: [HealthModule.forRoot()]` 即自动暴露
 * GET /health（liveness）与 GET /health/ready（readiness）。
 *
 * - 自动发现容器内 TypeORM 数据源、（可选）Redis，并发现所有 @HealthIndicator 业务检查项。
 * - 行为由 APP_HEALTH_* env 驱动（开关 / 令牌 / 缓存 / 单项超时）。
 * - 设为 @Global，业务 indicator 所在模块无需再 import 即可被发现。
 */
@Global()
@Module({})
export class HealthModule {
  static forRoot(): DynamicModule {
    return {
      module: HealthModule,
      imports: [DiscoveryModule],
      controllers: [HealthController],
      providers: [HealthService, HealthTokenGuard],
      exports: [HealthService],
    };
  }
}
