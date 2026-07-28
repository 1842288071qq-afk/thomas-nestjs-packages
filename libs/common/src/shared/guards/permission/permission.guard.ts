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
import { ThreadLocal } from '@qyy-code-lego/nestjs/core/nest/als/thread-local';
import {
  Identity,
  IdentityType,
} from '@qyy-code-lego/nestjs/entities/core/identity';

/**
 * 权限检查卫兵
 *
 * 支持的身份类型：
 * - OP_USER: 后台用户（拥有角色和权限）
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

    return this.checkPermissions(identity, requirement);
  }

  /**
   * 权限检查入口
   */
  private async checkPermissions(
    identity: Identity,
    requirement: PermissionRequirement,
  ): Promise<boolean> {
    // 当前项目仅支持 OP_USER 的权限检查
    if (identity.identityType !== IdentityType.OP_USER) {
      throw new ForbiddenException(
        `Permission check not supported for identity type: ${identity.identityType}`,
      );
    }

    await this.mountRolesAndPermissions(identity);

    const permissionCodes = this.getMountedPermissionCodes();

    // 后台超级管理员直接放行
    if (this.isOpSuper(identity)) {
      return true;
    }

    if (!this.checkRequirement(requirement, permissionCodes)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /**
   * 将用户权限和角色挂载到 ThreadLocal（避免重复查询）
   */
  private async mountRolesAndPermissions(identity: Identity): Promise<void> {
    // 如果已挂载，直接返回
    if (this.threadLocal.get('permissionCodes')) {
      return;
    }

    const opUser = this.getOpUser(identity);

    const userPermData = await this.permissionService.getUserPermissionData(
      opUser.id,
    );

    const [roleObjects, allPermissions] = await Promise.all([
      this.permissionService.getRoleDataByCodes(userPermData.roleCodes),
      this.isOpSuper(identity)
        ? this.permissionService.getPermissions()
        : Promise.resolve(null),
    ]);

    const permissionCodes = allPermissions
      ? allPermissions.map((item) => item.code)
      : userPermData.permissionCodes;

    this.threadLocal.set('roles', roleObjects);
    this.threadLocal.set('permissionCodes', permissionCodes);
  }

  /**
   * 获取 OP_USER 业务对象
   */
  private getOpUser(identity: Identity) {
    if (!identity.opUser) {
      throw new UnauthorizedException('OpUser not found in identity');
    }

    return identity.opUser;
  }

  /**
   * 判断是否为后台超级管理员
   */
  private isOpSuper(identity: Identity): boolean {
    return identity.opUser?.isSuper === true;
  }

  /**
   * 获取已经挂载的权限列表
   */
  private getMountedPermissionCodes(): string[] {
    const permissionCodes = this.threadLocal.get('permissionCodes');
    return Array.isArray(permissionCodes) ? permissionCodes : [];
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
