import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '@app/core/nest/cache/cache.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { BizError } from '@app/core/BizError';
import { IPageData } from '@app/core/Pagination';
import { HospitalRole } from '@app/entities/auth/hospital-role.entity';
import { HospitalRolePermission } from '@app/entities/auth/hospital-role-permission.entity';
import { HospitalAdminRole } from '@app/entities/auth/hospital-admin-role.entity';
import { HospitalAdmin } from '@app/entities/account/hospital-admin.entity';
import { Permission } from '@app/entities/auth/permission.entity';

export interface ICreateHospitalRoleParams {
  code: string;
  name: string;
  description?: string;
  enable?: string;
}

export interface IUpdateHospitalRoleParams {
  name?: string;
  description?: string;
  enable?: string;
}

@Injectable()
export class HospitalRoleSharedService {
  private readonly logger = new Logger(HospitalRoleSharedService.name);

  constructor(
    @InjectRepository(HospitalRole)
    private readonly roleRepository: Repository<HospitalRole>,
    @InjectRepository(HospitalRolePermission)
    private readonly rolePermissionRepository: Repository<HospitalRolePermission>,
    @InjectRepository(HospitalAdminRole)
    private readonly adminRoleRepository: Repository<HospitalAdminRole>,
    private readonly cacheService: CacheService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 创建角色
   * @param operatorId 操作人身份ID
   */
  async createRole(
    hospitalId: string,
    params: ICreateHospitalRoleParams,
    operatorId?: string,
  ): Promise<HospitalRole> {
    if (!hospitalId) throw new BizError('医院ID不能为空').codeAs(40001);
    if (!params.code) throw new BizError('角色代码不能为空').codeAs(40002);
    if (!params.name) throw new BizError('角色名称不能为空').codeAs(40003);
    const { code, name, description } = params;

    // 检查名称是否重复
    const existing = await this.roleRepository.findOne({
      where: { hospitalId, name },
    });
    if (existing) {
      throw new BizError('角色名称已存在').codeAs(40901);
    }

    const role = this.roleRepository.create({
      hospitalId,
      code,
      name,
      description,
      enable: params.enable || 'enabled',
      createdBy: operatorId || undefined,
    });

    return await this.roleRepository.save(role);
  }

  /**
   * 更新角色
   * @param operatorId 操作人身份ID
   */
  async updateRole(
    id: string,
    params: IUpdateHospitalRoleParams,
    operatorId?: string,
  ): Promise<HospitalRole> {
    if (!id) throw new BizError('角色ID不能为空').codeAs(40001);
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new BizError('角色不存在').codeAs(40400);

    if (params.name && params.name !== role.name) {
      const existing = await this.roleRepository.findOne({
        where: { hospitalId: role.hospitalId, name: params.name },
      });
      if (existing && existing.id !== id) {
        throw new BizError('角色名称已存在').codeAs(40901);
      }
    }

    Object.assign(role, params);
    role.updatedBy = operatorId || undefined;

    const saved = await this.roleRepository.save(role);

    // 清理缓存
    await this.clearRoleCache(saved);

    return saved;
  }

  /**
   * 更新启用状态
   * @param operatorId 操作人身份ID
   */
  async updateEnableStatus(
    id: string,
    enable: string,
    operatorId?: string,
  ): Promise<HospitalRole> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new BizError('角色不存在').codeAs(40400);

    role.enable = enable;
    role.updatedBy = operatorId || undefined;

    const saved = await this.roleRepository.save(role);

    // 清理缓存
    await this.clearRoleCache(saved);

    return saved;
  }

  /**
   * 清理角色相关缓存
   */
  private async clearRoleCache(role: HospitalRole) {
    // 1. 清理角色数据解析缓存
    const roleKey = `permission:role_data:hospital:${role.hospitalId}:${role.code}`;
    await this.cacheService.evict(roleKey);

    // 2. 清理拥有该角色的用户的权限缓存
    const adminRoles = await this.adminRoleRepository.find({
      where: { roleId: role.id },
      select: ['hospitalAdminId'],
    });

    const userKeys = adminRoles.map(
      (ar) => `permission:user_permission_data:hospital:${ar.hospitalAdminId}`,
    );

    if (userKeys.length > 0) {
      await this.cacheService.evictMany(userKeys);
    }
  }

  /**
   * 删除角色
   */
  async deleteRole(id: string): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) return;

    // 检查是否有管理员绑定
    const bindingCount = await this.adminRoleRepository.count({
      where: { roleId: id },
    });
    if (bindingCount > 0) {
      throw new BizError('该角色已绑定管理员，无法删除').codeAs(40902);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(HospitalRolePermission, { roleId: id });
      await manager.delete(HospitalRole, { id });
    });
  }

  /**
   * 设置角色权限
   */
  async setRolePermissions(
    roleId: string,
    permissionCodes: string[],
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(HospitalRolePermission, { roleId });

      if (permissionCodes.length > 0) {
        const entities = permissionCodes.map((code) =>
          manager.create(HospitalRolePermission, {
            roleId,
            permissionCode: code,
          }),
        );
        await manager.save(entities);
      }
    });
  }

  /**
   * 获取医院所有角色 (列表模式)
   */
  async findRolesByHospitalId(
    hospitalId: string,
    params: { name?: string; code?: string; limit?: number },
  ): Promise<HospitalRole[]> {
    const { name, code, limit } = params;
    const qb = this.roleRepository.createQueryBuilder('role');
    qb.where('role.hospitalId = :hospitalId', { hospitalId });

    if (name) {
      qb.andWhere('role.name LIKE :name', { name: `%${name}%` });
    }
    if (code) {
      qb.andWhere('role.code LIKE :code', { code: `%${code}%` });
    }

    qb.leftJoinAndSelect('role.creator', 'creator')
      .leftJoinAndSelect('creator.opUser', 'creatorOpUser')
      .leftJoinAndSelect('creator.hospitalAdmin', 'creatorAdmin')
      .loadRelationCountAndMap('role.userCount', 'role.adminBindings')
      .orderBy('role.createdAt', 'DESC');

    if (limit && limit > 0) {
      qb.take(limit);
    }

    return await qb.getMany();
  }

  /**
   * 分页查询角色
   */
  async findRolePage(
    hospitalId: string,
    params: { name?: string; code?: string; page: number; pageSize: number },
  ): Promise<IPageData<HospitalRole>> {
    const { name, code, page, pageSize } = params;
    const qb = this.roleRepository.createQueryBuilder('role');
    qb.where('role.hospitalId = :hospitalId', { hospitalId });

    if (name) {
      qb.andWhere('role.name LIKE :name', { name: `%${name}%` });
    }
    if (code) {
      qb.andWhere('role.code LIKE :code', { code: `%${code}%` });
    }

    const [rows, total] = await qb
      .leftJoinAndSelect('role.creator', 'creator')
      .leftJoinAndSelect('creator.account', 'creatorAccount')
      .loadRelationCountAndMap('role.userCount', 'role.adminBindings')
      .orderBy('role.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { rows, total, page, pageSize };
  }

  /**
   * 获取角色详情
   */
  async findOneRole(hospitalId: string, id: string): Promise<HospitalRole> {
    const role = await this.roleRepository.findOne({
      where: { id, hospitalId },
      relations: ['creator', 'creator.account'],
    });
    if (!role) throw new BizError('角色不存在').codeAs(40400);
    return role;
  }

  /**
   * 查询角色下的管理员
   */
  async findAdminsByRoleId(
    roleId: string,
    page: number,
    pageSize: number,
  ): Promise<IPageData<HospitalAdmin>> {
    const qb = this.adminRoleRepository
      .createQueryBuilder('ar')
      .leftJoinAndSelect('ar.hospitalAdmin', 'admin')
      .leftJoinAndSelect('admin.identity', 'identity')
      .leftJoinAndSelect('identity.account', 'account')
      .leftJoinAndSelect('admin.dept', 'dept')
      .leftJoinAndSelect('ar.assignedBy', 'assignedBy')
      .leftJoinAndSelect('assignedBy.account', 'assignedByAccount')
      .where('ar.roleId = :roleId', { roleId })
      .andWhere('admin.deletedAt IS NULL');

    const [rows, total] = await qb
      .orderBy('admin.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    // 转换成 admin 结构
    const adminRows = rows.map((item) => item.hospitalAdmin!);

    return { rows: adminRows, total, page, pageSize };
  }

  /**
   * 获取角色的权限
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const list = await this.rolePermissionRepository.find({
      where: { roleId },
      relations: ['permission'],
    });
    return list.map((item) => item.permission).filter(Boolean) as Permission[];
  }

  /**
   * 给管理员分配角色
   * @param operatorId 操作人身份ID
   */
  async assignRolesToAdmin(
    hospitalAdminId: string,
    roleIds: string[],
    operatorId?: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // 如果 hospitalAdminId 为空或非数字（如果是 bigint），这里可能会报错
      // 增加防空校验
      if (!hospitalAdminId) return;

      await manager.delete(HospitalAdminRole, { hospitalAdminId });

      if (roleIds.length > 0) {
        const entities = roleIds
          .filter((id) => !!id) // 过滤掉空的角色ID
          .map((roleId) =>
            manager.create(HospitalAdminRole, {
              hospitalAdminId,
              roleId,
              assignedAdminId: operatorId || undefined,
            }),
          );
        if (entities.length > 0) {
          await manager.save(entities);
        }
      }
      // 如果为空，直接删除所有角色
      if (roleIds.length === 0) {
        await manager.delete(HospitalAdminRole, { hospitalAdminId });
      }
    });
  }

  /**
   * 获取管理员拥有的角色ID列表
   */
  async getAdminRoleIds(hospitalAdminId: string): Promise<string[]> {
    const list = await this.adminRoleRepository.find({
      where: { hospitalAdminId },
    });
    return list.map((item) => item.roleId);
  }

  /**
   * 获取管理员拥有的角色完整信息列表
   */
  async getAdminRoles(hospitalAdminId: string): Promise<HospitalRole[]> {
    const list = await this.adminRoleRepository.find({
      where: { hospitalAdminId },
      relations: ['role'],
    });
    return list.map((item) => item.role).filter(Boolean) as HospitalRole[];
  }

  /**
   * 获取医院角色简单列表 (ID and Name only)
   */
  async findRoleSimpleList(
    hospitalId: string,
    limit?: number,
  ): Promise<HospitalRole[]> {
    return await this.roleRepository.find({
      where: { hospitalId },
      select: ['id', 'name'],
      order: { name: 'ASC' },
      ...(limit && limit > 0 ? { take: limit } : {}),
    });
  }
  /**
   * 批量给角色绑定管理员
   * @param operatorId 操作人身份ID
   */
  async bindUsersToRole(
    roleId: string,
    adminIds: string[],
    operatorId?: string,
  ): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) throw new BizError('角色不存在').codeAs(40400);

    await this.dataSource.transaction(async (manager) => {
      for (const adminId of adminIds) {
        // 检查是否已经绑定
        const existing = await manager.findOne(HospitalAdminRole, {
          where: { roleId, hospitalAdminId: adminId },
        });
        if (existing) continue;

        const binding = manager.create(HospitalAdminRole, {
          roleId,
          hospitalAdminId: adminId,
          assignedAdminId: operatorId || undefined,
        });
        await manager.save(binding);
      }
    });

    // 清理这些用户的权限缓存
    const userKeys = adminIds.map(
      (id) => `permission:user_permission_data:hospital:${id}`,
    );
    if (userKeys.length > 0) {
      await this.cacheService.evictMany(userKeys);
    }
  }

  /**
   * 批量解绑角色的管理员
   */
  async unbindUsersFromRole(roleId: string, adminIds: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(HospitalAdminRole, {
        roleId,
        hospitalAdminId: In(adminIds),
      });
    });

    // 清理这些用户的权限缓存
    const userKeys = adminIds.map(
      (id) => `permission:user_permission_data:hospital:${id}`,
    );
    if (userKeys.length > 0) {
      await this.cacheService.evictMany(userKeys);
    }
  }
}
