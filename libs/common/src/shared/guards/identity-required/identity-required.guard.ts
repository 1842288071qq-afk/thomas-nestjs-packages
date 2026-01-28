import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ThreadLocal } from '@app/core/nest/als/thread-local';
import {
  IDENTITY_REQUIRED_KEY,
  IdentityType,
  identityTypeNameMap,
} from './identity-required.decorator';
import { BizError } from '@app/core/BizError';
import { IdentityActiveService } from '../../identity-active.service';

@Injectable()
export class IdentityRequiredGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly threadLocal: ThreadLocal,
    private readonly activeService: IdentityActiveService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredIdentities = this.reflector.getAllAndOverride<IdentityType[]>(
      IDENTITY_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<Request>();
    const identityId = this.extractIdentityId(request);

    // --- 尝试前置挂载身份信息 ---
    if (identityId) {
      const account = this.threadLocal.get('account');
      if (account) {
        const identity = account.identities?.find((i) => i.id === identityId);
        if (identity) {
          // 检查身份是否被冻结（即使没有 @IdentityRequired 装饰器也要检查）
          if (identity.status !== 'active') {
            throw new BizError('身份已冻结，请联系管理员')
              .codeAs(40301)
              .httpStatusAs(403);
          }
          // 提前挂载，这样即使没有 @IdentityRequired，代码里也能通过 ThreadLocal 获取到
          this.threadLocal.set('identity', identity);

          // 记录活跃时间 (异步不阻塞)
          void this.activeService.recordActive(identity.id);
        }
      }
    }

    // 如果没有设置装饰器，默认允许通过
    if (!requiredIdentities || requiredIdentities.length === 0) {
      return true;
    }

    // --- 以下是强制验证逻辑 ---
    if (!identityId) {
      throw new BizError('缺少身份ID').codeAs(40100).httpStatusAs(401);
    }

    const identity = this.threadLocal.get('identity');
    if (!identity) {
      throw new BizError('账号身份不正确').codeAs(40100).httpStatusAs(401);
    }

    // 检查身份是否被冻结
    if (identity.status !== 'active') {
      throw new BizError('身份已冻结，请联系管理员')
        .codeAs(40301)
        .httpStatusAs(403);
    }

    const identityType = identity.identityType;
    if (!requiredIdentities.includes(identityType)) {
      const identityTypeName = identityTypeNameMap[identityType];
      throw new BizError(`身份类型（${identityTypeName}）不允许访问此资源`)
        .codeAs(40100)
        .httpStatusAs(401);
    }

    return true;
  }

  private extractIdentityId(req: Request): string | undefined {
    return ((req.headers['wjy-identity-id'] as string) ||
      (req.body as { wjyIdentityId: string })?.wjyIdentityId ||
      req.query?.wjyIdentityId) as string;
  }
}
