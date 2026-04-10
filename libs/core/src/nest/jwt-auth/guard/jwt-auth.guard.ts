/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtErrorCode } from '../error/jwt-error.enum';
import { JwtAuthException } from '../error/jwt.exception';
import { IS_PUBLIC_KEY } from '../decorator/public.decorator';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    // 1️⃣ 装饰器白名单
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2️⃣ Config 白名单
    const whiteList = this.config.get<string[]>('jwt.whiteList', []);
    if (whiteList.includes(request.path)) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (!user && !info) {
      throw new JwtAuthException(JwtErrorCode.MISSING);
    }

    if (info instanceof Error && info.message === 'No auth token') {
      throw new JwtAuthException(JwtErrorCode.MISSING);
    }

    if (info?.name === 'JsonWebTokenError') {
      throw new JwtAuthException(JwtErrorCode.INVALID);
    }

    if (info?.name === 'TokenExpiredError') {
      throw new JwtAuthException(JwtErrorCode.EXPIRED);
    }

    if (err) throw err;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }
}
