import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { AppConfig } from '@thomas/nestjs/common/config/config.interface';
import { Public } from '../jwt-auth/decorator/public.decorator';
import { HEALTH_ROUTE_BASE } from './health.constants';
import { HealthService } from './health.service';
import { HealthTokenGuard } from './health-token.guard';

/**
 * 健康接口（路径固定 /health，免 JWT；用 @Res 完全接管响应，绕过全局 ApiResBody 封装，
 * 返回标准健康结构并自定义 HTTP 状态码）。
 */
@Controller(HEALTH_ROUTE_BASE)
export class HealthController {
  constructor(
    private readonly service: HealthService,
    private readonly config: ConfigService<AllConfig>,
  ) {}

  /** liveness：探活，极简、可公开 */
  @Public()
  @Get()
  liveness(@Res() res: Response): void {
    if (!this.enabled()) {
      this.notFound(res);
      return;
    }
    res.status(200).json(this.service.liveness());
  }

  /** readiness：就绪详情，受令牌保护；down/degraded 返回 503 */
  @Public()
  @UseGuards(HealthTokenGuard)
  @Get('ready')
  async readiness(@Res() res: Response): Promise<void> {
    if (!this.enabled()) {
      this.notFound(res);
      return;
    }
    const report = await this.service.readiness();
    res.status(report.status === 'up' ? 200 : 503).json(report);
  }

  private enabled(): boolean {
    return this.config.get<AppConfig>('app')?.health.enabled ?? true;
  }

  private notFound(res: Response): void {
    res.status(404).json({ statusCode: 404, message: 'Not Found' });
  }
}
