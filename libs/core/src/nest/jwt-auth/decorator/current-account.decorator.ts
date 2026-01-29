import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.type';

/**
 * 获取当前请求的账号 ID
 * 从 JWT token 的 payload 中提取 accountId
 *
 * @example
 * getMe(@CurrentAccount() accountId: string) {}
 */
export const CurrentAccount = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;

    if (!user?.accountId) {
      throw new Error('无法获取当前账号信息');
    }

    return user.accountId;
  },
);
