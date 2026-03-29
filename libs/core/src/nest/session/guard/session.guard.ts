import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SessionService } from '../session.service';
import { IS_PUBLIC_KEY } from '../../jwt-auth/decorator/public.decorator';
import { JwtPayload } from '../../jwt-auth/types/jwt-payload.type';

/**
 * Session 会话守卫
 *
 * 用于校验当前 JWT 令牌对应的会话是否在 Redis 中仍然有效。
 * ⚠️ 注意：该 Guard 必须在 JwtAuthGuard 之后执行，因为它依赖于 request.user 中的 jti。
 * 通常通过 GlobalGuardsModule.connect 按固定顺序注册。
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. 检查是否是公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload;

    // 2. 检查 JWT 是否已解析 (jti 是否存在)
    if (!user || !user.jti) {
      return true; // 如果没有 JWT，交给 JwtAuthGuard 处理或允许通过（取决于业务逻辑，通常 JwtAuthGuard 会先拦截）
    }

    // 3. 验证会话 (内部处理超时检查)
    await this.sessionService.validateSession(user.accountId, user.jti);

    // 4. 更新活跃时间 (异步去抖)
    void this.sessionService.updateLastActivity(user.accountId, user.jti);

    return true;
  }
}
