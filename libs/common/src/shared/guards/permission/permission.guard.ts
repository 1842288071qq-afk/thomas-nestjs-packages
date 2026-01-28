import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PermissionService } from './permission.service';
import { PERMISSION_REQUIRED_KEY } from './permission-required.decorator';
import { PermissionRequirement } from './permission.types';
import { ThreadLocal } from '@app/core/nest/als/thread-local';
import { Identity, IdentityType } from '@app/entities/core/identity';

/**
 * 权限检查卫兵
 *
 * 支持的身份类型：
 * - OP_USER: 运营平台用户（拥有角色和权限）
 *
 * 后续扩展其他身份类型时：
 * 1. 在 Identity 实体中添加新的关联关系
 * 2. 在本卫兵中添加新的分支处理逻辑
 * 3. 创建对应的 xxxPermissionService 来处理权限查询
 *
 * @example
 * ```typescript
 * // 使用装饰器来指定权限要求
 * @PermissionRequired('user.view')
 * @PermissionRequired(['user.create', 'user.delete']) // AND 关系
 * @PermissionRequired([['user.view'], ['admin.view']]) // OR 关系
 * @PermissionRequired((perms) => perms.includes('admin'))
 * ```
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionService: PermissionService,
    private readonly threadLocal: ThreadLocal,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSION_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有权限要求，直接放行
    if (!requirement) {
      return true;
    }

    const store = this.threadLocal.getStore();
    if (!store || (!store.account && !store.identity)) {
      throw new UnauthorizedException('Identity not found in context');
    }

    const { identity } = store;
    if (!identity) {
      throw new UnauthorizedException('Identity not found in context');
    }

    // 仅支持 OP_USER 的权限检查
    if (identity.identityType !== IdentityType.OP_USER) {
      // 其他身份类型如需权限控制，需在此添加分支处理
      throw new ForbiddenException(
        `Permission check not supported for identity type: ${identity.identityType}`,
      );
    }

    return this.checkOpUserPermissions(identity, requirement);
  }

  /**
   * 检查运营平台用户的权限
   */
  private async checkOpUserPermissions(
    identity: Identity,
    requirement: PermissionRequirement,
  ): Promise<boolean> {
    const opUser = identity.opUser;
    if (!opUser) {
      throw new UnauthorizedException('OpUser not found in identity');
    }

    // 运营平台超级管理员直接放行
    if (opUser.isSuper) {
      return true;
    }

    // 获取并挂载用户权限到 ThreadLocal
    await this.mountUserPermissions(opUser.id);

    const permissionCodes = this.threadLocal.get('permissionCodes') || [];
    if (!this.checkRequirement(requirement, permissionCodes)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /**
   * 将用户权限和角色挂载到 ThreadLocal（避免重复查询）
   */
  private async mountUserPermissions(userId: string): Promise<void> {
    // 如果已挂载，直接返回
    if (this.threadLocal.get('permissionCodes')) {
      return;
    }

    const permData = await this.permissionService.getUserPermissionData(userId);

    // 根据角色代码翻译为角色对象
    const roleObjects = await this.permissionService.getRoleDataByCodes(
      permData.roleCodes,
    );

    this.threadLocal.set('roles', roleObjects);
    this.threadLocal.set('permissionCodes', permData.permissionCodes);
  }

  /**
   * 递归检查权限要求
   */
  private checkRequirement(
    req: PermissionRequirement,
    permissionList: string[],
  ): boolean {
    if (typeof req === 'string') {
      return permissionList.includes(req);
    }
    if (typeof req === 'function') {
      return req(permissionList);
    }
    if (Array.isArray(req)) {
      if (req.length === 0) return true;
      if (typeof req[0] === 'string') {
        return (req as string[]).every((p) => permissionList.includes(p));
      }
      return (req as PermissionRequirement[]).some((r) =>
        this.checkRequirement(r, permissionList),
      );
    }
    return false;
  }
}
