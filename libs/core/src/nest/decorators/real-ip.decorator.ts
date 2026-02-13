import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { getRealIp } from '../../utils/ip.util';

/**
 * 获取真实客户端 IP 的装饰器
 * 替代 NestJS 内置的 @Ip()，提供更强的代理穿透能力
 */
export const RealIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return getRealIp(request);
  },
);
