import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AppConfig } from '@qyy-code-lego/nestjs/common/config/config.interface';
import { HEALTH_TOKEN_HEADER } from './health.constants';

/**
 * 详情接口（/health/ready）令牌校验：
 * - 未配置 APP_HEALTH_TOKEN → 放行（保护交给 nginx IP 白名单等外层）。
 * - 配置了令牌 → 需 X-Health-Token 头或 ?token= 与之匹配，否则 401。
 */
@Injectable()
export class HealthTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService<AllConfig>) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<AppConfig>('app')?.health.token;
    if (!expected) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const headerRaw = req.headers[HEALTH_TOKEN_HEADER];
    const headerToken = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
    const queryToken =
      typeof req.query?.token === 'string' ? req.query.token : undefined;
    const provided = headerToken ?? queryToken;

    if (provided === expected) {
      return true;
    }
    throw new UnauthorizedException('invalid health token');
  }
}
