import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CacheService } from '@thomas/nestjs/core/nest/cache/cache.service';
import { OpPermission } from '@thomas/nestjs/entities/core/common-business/op-permission.entity';
import { OpRolePermission } from '@thomas/nestjs/entities/core/common-business/op-role-permission.entity';
import { OpRole } from '@thomas/nestjs/entities/core/common-business/op-role.entity';
import { OpUserRole } from '@thomas/nestjs/entities/core/common-business/op-user-role.entity';
import { UserRoleData } from './permission.types';

/**
 * 缓存 key 工厂函数
 */
export const cacheKeys = {
  // 所有权限数据
  allPermissions: () => 'permission:op:all_permissions',
  // 角色数据
  roleData: (roleCode: string) => `permission:op:role_data:${roleCode}`,
  // 用户权限数据
  userPermData: (userId: string) => `permission:op:user:${userId}`,
};

/**
 * OpUser 权限服务 - 仅支持运营平台超级管理员和普通用户的角色权限管理
 *
 * 后续如需支持其他身份类型的权限管理，应：
 * 1. 在对应的 Module 中创建新的 xxxPermissionService
 * 2. 在 PermissionGuard 中通过 Identity 类型分发到不同的服务
 */
@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(OpPermission)
    private readonly opPermissionRepo: Repository<OpPermission>,
    @InjectRepository(OpRolePermission)
    private readonly opRolePermissionRepo: Repository<OpRolePermission>,
    @InjectRepository(OpRole)
    private readonly opRoleRepo: Repository<OpRole>,
    @InjectRepository(OpUserRole)
    private readonly opUserRoleRepo: Repository<OpUserRole>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 获取所有运营平台权限
   */
  async getPermissions() {
    return this.cacheService.wrap(
      {
        key: cacheKeys.allPermissions(),
      },
      () => this.opPermissionRepo.find(),
    );
  }

  /**
   * 权限 code 转换为权限对象
   */
  async getPermissionsByCodes(codes: string[]) {
    if (!codes || codes.length === 0) return [];
    const all = await this.getPermissions();
    return all.filter((p) => codes.includes(p.code));
  }

  /**
   * 根据 roleCode 获取角色数据（支持批量）
   */
  async getRoleDataByCodes(roleCodes: string[]): Promise<OpRole[]> {
    if (!roleCodes || roleCodes.length === 0) return [];

    const keys = roleCodes.map((roleCode) => cacheKeys.roleData(roleCode));
    const cached = await this.cacheService.getMany<OpRole>(keys);

    const result: OpRole[] = [];
    const missCodes: string[] = [];
    const missIndices: number[] = [];

    cached.forEach((item, index) => {
      if (item) {
        result.push(item);
      } else {
        missCodes.push(roleCodes[index]);
        missIndices.push(index);
      }
    });

    if (missCodes.length > 0) {
      const dbItems = await this.opRoleRepo.find({
        where: { code: In(missCodes) },
      });

      for (const item of dbItems) {
        result.push(item);
        await this.cacheService.set(
          cacheKeys.roleData(item.code),
          item,
          3600 * 24,
        );
      }
    }

    return result;
  }

  /**
   * 获取用户的角色和权限数据
   *
   * @param userId OpUser 的 ID
   * @returns 用户拥有的角色 codes 和权限 codes
   */
  async getUserPermissionData(userId: string): Promise<UserRoleData> {
    return this.cacheService.wrap(
      {
        key: cacheKeys.userPermData(userId),
        ttl: 3600 * 24, // 身份变更时应主动清除
      },
      async () => {
        // 获取用户绑定的角色
        const userRoles = await this.opUserRoleRepo.find({
          where: { opUserId: userId },
          relations: ['role'],
        });

        const roleCodes = userRoles
          .map((ur) => ur.role)
          .filter((role): role is OpRole => !!role && role.status === 'active')
          .map((role) => role.code);

        const roleIds = userRoles
          .filter((ur) => ur.role?.status === 'active')
          .map((ur) => ur.roleId);

        if (roleIds.length === 0) {
          return { roleCodes: [], permissionCodes: [] };
        }

        // 获取角色关联的权限 code（并集）
        const rolePermissions = await this.opRolePermissionRepo.find({
          where: { roleId: In(roleIds) },
          select: ['permissionCode'],
        });

        const permissionCodes = Array.from(
          new Set(rolePermissions.map((rp) => rp.permissionCode)),
        );

        return { roleCodes, permissionCodes };
      },
    );
  }

  /**
   * 清除用户的权限缓存（在用户角色变更时调用）
   */
  async clearUserPermissionCache(userId: string): Promise<void> {
    await this.cacheService.evict(cacheKeys.userPermData(userId));
  }

  /**
   * 清除角色缓存（在角色信息更新时调用）
   */
  async clearRoleCache(roleCode: string): Promise<void> {
    await this.cacheService.evict(cacheKeys.roleData(roleCode));
  }

  /**
   * 清除所有权限缓存（在权限配置变更时调用）
   */
  async clearAllPermissionsCache(): Promise<void> {
    await this.cacheService.evict(cacheKeys.allPermissions());
  }
}
