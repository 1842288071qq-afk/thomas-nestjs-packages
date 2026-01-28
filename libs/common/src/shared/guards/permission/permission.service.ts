import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CacheService } from '@app/core/nest/cache/cache.service';
import { Permission } from '@app/entities/auth/permission.entity';
import { OpPermission } from '@app/entities/core/common-business/op-permission.entity';
import { HospitalRolePermission } from '@app/entities/auth/hospital-role-permission.entity';
import { OpRolePermission } from '@app/entities/core/common-business/op-role-permission.entity';
import {
  HospitalRole,
  OpRole,
  HospitalPermission,
  HospitalAdminRole,
  OpUserRole,
} from '@app/entities/auth';
import { OpAgentUserRole } from '@app/entities/op-account/op-agent-user-role.entity';

// 权限表数据缓存
export const all_permission_data_key = (type: 'hospital' | 'op' | 'agent') => {
  return `permission:all_permission_data:${type}`;
};

// 每个医院（或运营平台）的角色表数据缓存，用于根据roleCodes翻译出角色对象，以roleCode标记
interface role_data_key_options {
  type: 'hospital' | 'op' | 'agent';
  roleCode: string;
  hospitalId?: string;
}
export const role_data_key = (option: role_data_key_options) => {
  const { type, roleCode, hospitalId } = option;
  if (type === 'hospital' && !hospitalId) {
    throw new Error(
      'role_data_key: hospitalId is required when type is hospital',
    );
  }
  return `permission:role_data:${type}:${type === 'hospital' ? hospitalId : 'yypt'}:${roleCode}`;
};

// 医院最大权限缓存，用于全局管理员时直接赋予的最高权限
export const max_permission_codes_key = (hospitalId: string) => {
  return `permission:max_permission_codes:hospital:${hospitalId || 'yypt'}`;
};

// 每个身份用户的角色和权限数据缓存
interface user_permission_data_key_options {
  type: 'hospital' | 'op' | 'agent';
  userId: string;
}
export const user_permission_data_key = (
  options: user_permission_data_key_options,
) => {
  const { type, userId } = options;
  return `permission:user_permission_data:${type}:${userId}`;
};

// 每个身份用户的角色和权限数据格式
export interface UserRoleData {
  roleCodes: string[];
  permissionCodes: string[];
}

/**
 * 这个服务工具储存了关于系统权限、医院角色和权限、身份角色和权限相关查询和缓存服务
 */
@Injectable()
export class PermissionService implements OnModuleInit {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(OpPermission)
    private readonly opPermissionRepo: Repository<OpPermission>,
    @InjectRepository(HospitalRolePermission)
    private readonly hospitalRolePermissionRepo: Repository<HospitalRolePermission>,
    @InjectRepository(OpRolePermission)
    private readonly opRolePermissionRepo: Repository<OpRolePermission>,
    @InjectRepository(HospitalRole)
    private readonly hospitalRoleRepo: Repository<HospitalRole>,
    @InjectRepository(OpRole)
    private readonly opRoleRepo: Repository<OpRole>,
    @InjectRepository(HospitalPermission)
    private readonly hospitalPermissionRepo: Repository<HospitalPermission>,
    @InjectRepository(HospitalAdminRole)
    private readonly hospitalAdminRoleRepo: Repository<HospitalAdminRole>,
    @InjectRepository(OpUserRole)
    private readonly opUserRoleRepo: Repository<OpUserRole>,
    @InjectRepository(OpAgentUserRole)
    private readonly opAgentUserRoleRepo: Repository<OpAgentUserRole>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 获取数据库权限表
   * @param type
   */
  async getPermissions(type: 'hospital' | 'op' | 'agent') {
    return this.cacheService.wrap(
      {
        key: all_permission_data_key(type),
        ttl: 3600 * 24, // 24小时
      },
      () => {
        const repo =
          type === 'hospital' ? this.permissionRepo : this.opPermissionRepo;
        return repo.find();
      },
    );
  }

  /**
   * 权限code翻译为权限对象
   * @param codes
   * @param type
   */
  async getPermissionsByCodes(
    codes: string[],
    type: 'hospital' | 'op' | 'agent',
  ) {
    if (!codes || codes.length === 0) return [];
    const all = await this.getPermissions(type);
    return all.filter((p) => codes.includes(p.code));
  }

  /**
   * 根据code获取多个角色数据（redis的getMany获取）
   * @param options
   */
  async getRoleDataByCodes<T = HospitalRole | OpRole>(options: {
    type: 'hospital' | 'op' | 'agent';
    roleCodes: string[];
    hospitalId?: string;
  }) {
    const { type, roleCodes, hospitalId } = options;
    if (!roleCodes || roleCodes.length === 0) return [];

    const keys = roleCodes.map((roleCode) =>
      role_data_key({ type, roleCode, hospitalId }),
    );
    const cached = await this.cacheService.getMany<T>(keys);

    const result: T[] = [];
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
      const repo =
        type === 'hospital' ? this.hospitalRoleRepo : this.opRoleRepo;
      const where = { code: In(missCodes) } as Record<string, any>;
      if (type === 'hospital') {
        where.hospitalId = hospitalId;
      }
      const dbItems = await repo.find({ where });

      for (const item of dbItems) {
        result.push(item as T);
        await this.cacheService.set(
          role_data_key({ type, roleCode: item.code, hospitalId }),
          item,
          3600 * 24,
        );
      }
    }

    return result;
  }

  /**
   * 获取医院最大权限
   * @param hospitalId
   */
  async getMaxPermissionCodes(hospitalId: string | string[]) {
    const ids = Array.isArray(hospitalId) ? hospitalId : [hospitalId];
    const keys = ids.map((id) => max_permission_codes_key(id));

    const cached = await this.cacheService.getMany<string[]>(keys);
    const resultMap: Record<string, string[]> = {};
    const missIds: string[] = [];

    ids.forEach((id, index) => {
      if (cached[index]) {
        resultMap[id] = cached[index];
      } else {
        missIds.push(id);
      }
    });

    if (missIds.length > 0) {
      // 处理 yypt (运营平台全量权限)
      if (missIds.includes('yypt')) {
        const allOp = await this.getPermissions('op');
        const codes = allOp.map((p) => p.code);
        resultMap['yypt'] = codes;
        await this.cacheService.set(
          max_permission_codes_key('yypt'),
          codes,
          3600 * 24,
        );
        const idx = missIds.indexOf('yypt');
        missIds.splice(idx, 1);
      }

      // 处理其他正常医院
      if (missIds.length > 0) {
        const hps = await this.hospitalPermissionRepo.find({
          where: { hospitalId: In(missIds) },
        });

        for (const hp of hps) {
          resultMap[hp.hospitalId] = hp.permissionCodes;
          await this.cacheService.set(
            max_permission_codes_key(hp.hospitalId),
            hp.permissionCodes,
            3600 * 24,
          );
        }

        // 没查到的医院默认为空
        missIds.forEach((id) => {
          if (!resultMap[id]) {
            resultMap[id] = [];
          }
        });
      }
    }

    return Array.isArray(hospitalId) ? resultMap : resultMap[hospitalId];
  }

  async getUserPermissionData(
    options: user_permission_data_key_options,
  ): Promise<UserRoleData> {
    const { type, userId } = options;
    return this.cacheService.wrap(
      {
        key: user_permission_data_key(options),
        ttl: 3600 * 24, // 身份变更时应主动清除
      },
      async () => {
        if (type === 'hospital') {
          // 1. 获取管理员绑定的角色及其关联的角色对象
          const adminRoles = await this.hospitalAdminRoleRepo.find({
            where: { hospitalAdminId: userId },
            relations: ['role'],
          });

          const roleCodes = adminRoles
            .map((ar) => ar.role)
            .filter(
              (role): role is HospitalRole =>
                !!role && role.enable === 'enabled',
            )
            .map((role) => role.code);
          const roleIds = adminRoles
            .filter((ar) => ar.role?.enable === 'enabled')
            .map((ar) => ar.roleId);

          if (roleIds.length === 0) {
            return { roleCodes: [], permissionCodes: [] };
          }

          // 2. 获取角色关联的权限 code (并集)
          const rolePermissions = await this.hospitalRolePermissionRepo.find({
            where: { roleId: In(roleIds) },
            select: ['permissionCode'],
          });

          const permissionCodes = Array.from(
            new Set(rolePermissions.map((rp) => rp.permissionCode)),
          );

          return { roleCodes, permissionCodes };
        } else if (type === 'agent') {
          // 代理商逻辑
          const agentRoles = await this.opAgentUserRoleRepo.find({
            where: { agentUserId: userId },
            relations: ['role'],
          });

          const roleCodes = agentRoles
            .map((ar) => ar.role)
            .filter(
              (role): role is OpRole => !!role && role.enable === 'enabled',
            )
            .map((role) => role.code);
          const roleIds = agentRoles
            .filter((ar) => ar.role?.enable === 'enabled')
            .map((ar) => ar.roleId);

          if (roleIds.length === 0) {
            return { roleCodes: [], permissionCodes: [] };
          }

          const rolePermissions = await this.opRolePermissionRepo.find({
            where: { roleId: In(roleIds) },
            select: ['permissionCode'],
          });

          const permissionCodes = Array.from(
            new Set(rolePermissions.map((rp) => rp.permissionCode)),
          );

          return { roleCodes, permissionCodes };
        } else {
          // 运营平台逻辑
          const userRoles = await this.opUserRoleRepo.find({
            where: { opUserId: userId },
            relations: ['role'],
          });

          const roleCodes = userRoles
            .map((ur) => ur.role)
            .filter(
              (role): role is OpRole => !!role && role.enable === 'enabled',
            )
            .map((role) => role.code);
          const roleIds = userRoles
            .filter((ur) => ur.role?.enable === 'enabled')
            .map((ur) => ur.roleId);

          if (roleIds.length === 0) {
            return { roleCodes: [], permissionCodes: [] };
          }

          const rolePermissions = await this.opRolePermissionRepo.find({
            where: { roleId: In(roleIds) },
            select: ['permissionCode'],
          });

          const permissionCodes = Array.from(
            new Set(rolePermissions.map((rp) => rp.permissionCode)),
          );

          return { roleCodes, permissionCodes };
        }
      },
    );
  }

  onModuleInit() {}
}
