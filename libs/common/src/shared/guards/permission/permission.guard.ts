import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PermissionService } from './permission.service';
import {
  PERMISSION_REQUIRED_KEY,
  PermissionRequirement,
} from './permission-required.decorator';
import { ThreadLocal } from '@app/core/nest/als/thread-local';
import { Identity, IdentityType } from '@app/entities/auth';

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

    // 1. 获取角色和权限并挂载到 ThreadLocal
    await this.mountRolesAndPermissions(identity);

    // 2. 检查权限要求
    const permissionCodes = this.threadLocal.get('permissionCodes') || [];

    // 如果是运营平台超管，直接放行
    if (this.isOpSuper(identity)) {
      return true;
    }

    if (!this.checkRequirement(requirement, permissionCodes)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /**
   * 挂载角色和权限到 ThreadLocal
   */
  private async mountRolesAndPermissions(identity: Identity) {
    // 如果已经挂载过，直接返回
    if (this.threadLocal.get('permissionCodes')) {
      return;
    }

    const isOp = identity.identityType === IdentityType.OP_USER;
    const isAgent = identity.identityType === IdentityType.OP_AGENT_USER;
    let type: 'hospital' | 'op' | 'agent' = 'hospital';
    if (isOp) type = 'op';
    else if (isAgent) type = 'agent';

    // 提取业务用户ID (OpUser.id || OpAgentUser.id || HospitalAdmin.id)
    let userId: string | undefined;
    if (isOp) {
      userId = identity.opUser?.id;
    } else if (isAgent) {
      userId = identity.opAgentUser?.id;
    } else {
      userId = identity.hospitalAdmin?.id;
    }

    if (!userId) {
      // 非后台管理身份（如学生、个人用户）或者未加载关联业务对象，设置为空
      this.threadLocal.set('roles', []);
      this.threadLocal.set('permissionCodes', []);
      return;
    }

    // 获取用户基础权限数据
    const userPermData = await this.permissionService.getUserPermissionData({
      type,
      userId,
    });

    let finalPermissionCodes = userPermData.permissionCodes;

    // 医院租户逻辑
    const hospitalId =
      identity.hospitalAdmin?.hospitalId || identity.student?.hospitalId;

    if (isOp || isAgent) {
      // 运营平台/代理商逻辑
      if (isOp && identity.opUser?.isSuper) {
        // 运营平台超管获取所有运营权限
        const allOpPerms = await this.permissionService.getPermissions('op');
        finalPermissionCodes = allOpPerms.map((p) => p.code);
      }
    } else {
      if (!hospitalId) {
        throw new UnauthorizedException('Hospital not found in context');
      }

      const maxPermCodes = (await this.permissionService.getMaxPermissionCodes(
        hospitalId,
      )) as string[];

      if (identity.hospitalAdmin?.isSuperAdmin) {
        // 医院超管直接赋予医院最大的权限码
        finalPermissionCodes = maxPermCodes;
      } else {
        // 普通管理员权限不能超过医院最大权限
        finalPermissionCodes = finalPermissionCodes.filter((code) =>
          maxPermCodes.includes(code),
        );
      }
    }

    // 获取角色对象列表
    const roleObjects = await this.permissionService.getRoleDataByCodes({
      type,
      roleCodes: userPermData.roleCodes,
      hospitalId,
    });

    this.threadLocal.set('roles', roleObjects);
    this.threadLocal.set('permissionCodes', finalPermissionCodes);
  }

  /**
   * 判断是否为运营平台超管
   */
  private isOpSuper(identity: Identity): boolean {
    return identity.opUser?.isSuper === true;
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
