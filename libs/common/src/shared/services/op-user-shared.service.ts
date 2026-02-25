import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OpUserRole } from '@thomas/nestjs/entities/core/common-business/op-user-role.entity';
import { OpAccount } from '@thomas/nestjs/entities/core/account/op-account.entity';
import { OpAccountCredential } from '@thomas/nestjs/entities/core/account/op-account-credential.entity';
import { BizError } from '@thomas/nestjs/core/BizError';
import { IPageData } from '@thomas/nestjs/core/Pagination';
import { PasswordUtil } from '@thomas/nestjs/common/utils/password';
import { OpDept } from '@thomas/nestjs/entities/core/common-business/op-dept.entity';
import {
  AccountSource,
  Identity,
  IdentityType,
  ObjectActiveStatus,
  OpUser,
} from '@thomas/nestjs/entities';
import { PermissionService } from '../guards/permission/permission.service';

export interface ICreateOpUserParams {
  username: string;
  password: string;
  name?: string;
  phone?: string;
  deptId?: string;
  isSuper?: boolean;
  roleIds?: string[];
  enable?: string;
}

export interface IUpdateOpUserParams {
  name?: string;
  phone?: string;
  deptId?: string | null;
  isSuper?: boolean;
  enable?: string;
  operatorId?: string;
}

export interface IOpUserQueryParams {
  name?: string;
  phone?: string;
  deptId?: string;
  enable?: string;
}

@Injectable()
export class OpUserSharedService {
  private readonly logger = new Logger(OpUserSharedService.name);

  private readonly bootstrapOpUserId = '1';
  private readonly bootstrapOpAccountId = '1';
  private readonly bootstrapUsername = 'admin';
  private readonly bootstrapPassword = 'admin';

  constructor(
    @InjectRepository(OpUser)
    private readonly opUserRepository: Repository<OpUser>,
    @InjectRepository(OpUserRole)
    private readonly opUserRoleRepository: Repository<OpUserRole>,
    @InjectRepository(OpAccount)
    private readonly opAccountRepository: Repository<OpAccount>,
    @InjectRepository(Identity)
    private readonly identityRepository: Repository<Identity>,
    @InjectRepository(OpDept)
    private readonly opDeptRepository: Repository<OpDept>,
    private readonly dataSource: DataSource,
    private readonly passwordUtil: PasswordUtil,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * 确保内置管理员存在（opUser.id=1, opAccount.id=1）
   * - 不存在时创建账号、身份、密码凭证、用户
   * - 存在则忽略
   */
  async ensureBootstrapAdminUser(): Promise<void> {
    const existing = await this.opUserRepository.findOne({
      where: { id: this.bootstrapOpUserId },
      withDeleted: true,
      relations: ['identity'],
    });

    if (existing && !existing.deletedAt) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      if (existing?.deletedAt) {
        await manager.restore(OpUser, this.bootstrapOpUserId);
        return;
      }

      let account = await manager.findOne(OpAccount, {
        where: { id: this.bootstrapOpAccountId },
      });

      if (!account) {
        const existingAdmin = await manager.findOne(OpAccount, {
          where: { username: this.bootstrapUsername },
        });
        const username = existingAdmin
          ? `${this.bootstrapUsername}_${this.bootstrapOpAccountId}`
          : this.bootstrapUsername;

        account = manager.create(OpAccount, {
          id: this.bootstrapOpAccountId,
          username,
          phone: undefined,
          nickname: '超级管理员',
          realName: '超级管理员',
          status: ObjectActiveStatus.ACTIVE,
        });
        account = await manager.save(account);
      }

      let identity = await manager.findOne(Identity, {
        where: {
          accountId: account.id,
          accountSource: AccountSource.OP_ACCOUNT,
          identityType: IdentityType.OP_USER,
        },
      });

      if (!identity) {
        identity = manager.create(Identity, {
          id: account.id,
          accountId: account.id,
          accountSource: AccountSource.OP_ACCOUNT,
          identityType: IdentityType.OP_USER,
          status: ObjectActiveStatus.ACTIVE,
        });
        identity = await manager.save(identity);
      }

      const passwordCredential = await manager.findOne(OpAccountCredential, {
        where: {
          opAccountId: account.id,
          type: 'password',
          isPrimary: true,
        },
      });

      if (!passwordCredential) {
        const { hash, salt } = this.passwordUtil.hashPassword(
          this.bootstrapPassword,
        );

        const credential = manager.create(OpAccountCredential, {
          opAccountId: account.id,
          type: 'password',
          identifier: account.username,
          secret: hash,
          salt,
          isPrimary: true,
          status: ObjectActiveStatus.ACTIVE,
        });
        await manager.save(credential);
      }

      const opUser = manager.create(OpUser, {
        id: this.bootstrapOpUserId,
        identityId: identity.id,
        name: '系统管理员',
        deptId: null,
        isSuper: true,
        status: ObjectActiveStatus.ACTIVE,
      });
      await manager.save(opUser);
    });

    this.logger.log('内置运营管理员检测完成（opUser.id=1）');
  }

  /**
   * 创建运营用户（包含账号、身份、凭证、用户记录）
   */
  async createOpUser(
    params: ICreateOpUserParams,
    operatorId?: string,
  ): Promise<OpUser> {
    const {
      username,
      password,
      name,
      phone,
      deptId,
      isSuper,
      roleIds,
      enable,
    } = params;

    if (!username) throw new BizError('用户名不能为空').codeAs(40001);
    if (!password) throw new BizError('密码不能为空').codeAs(40002);

    // 检查用户名是否已存在
    const existingAccount = await this.opAccountRepository.findOne({
      where: { username },
    });
    if (existingAccount) {
      throw new BizError('用户名已存在').httpStatusAs(409).codeAs(40901);
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. 创建账号
      const account = manager.create(OpAccount, {
        username,
        // 固定不维护账号的phone，单独由账号身份维护自己的手机号
        phone: undefined,
        nickname: name,
        realName: name,
        status: ObjectActiveStatus.ACTIVE,
      });
      const savedAccount = await manager.save(account);

      // 2. 创建身份
      const identity = manager.create(Identity, {
        accountId: savedAccount.id,
        accountSource: AccountSource.OP_ACCOUNT,
        identityType: IdentityType.OP_USER,
        status: ObjectActiveStatus.ACTIVE,
      });
      const savedIdentity = await manager.save(identity);

      // 3. 创建密码凭证
      const { hash, salt } = this.passwordUtil.hashPassword(password);
      const credential = manager.create(OpAccountCredential, {
        opAccountId: savedAccount.id,
        type: 'password',
        identifier: username,
        secret: hash,
        salt,
        isPrimary: true,
        status: ObjectActiveStatus.ACTIVE,
      });
      await manager.save(credential);

      // 处理空字符串 deptId,设置为默认部门
      let finalDeptId = deptId;
      if (!finalDeptId) {
        const defaultDept = await this.findDefaultOpDept();
        if (!defaultDept) {
          throw new BizError('未找到默认部门').codeAs(40404);
        }
        finalDeptId = defaultDept.id;
      }

      // 4. 创建用户记录
      const opUser = manager.create(OpUser, {
        identityId: savedIdentity.id,
        name: name || username,
        phone,
        deptId: finalDeptId,
        isSuper: isSuper || false,
        status:
          enable === 'disabled'
            ? ObjectActiveStatus.DISABLED
            : ObjectActiveStatus.ACTIVE,
        createdBy: operatorId,
      });
      const savedUser = await manager.save(opUser);

      // 5. 如果有角色，绑定角色
      if (roleIds && roleIds.length > 0) {
        const userRoles = roleIds.map((roleId) =>
          manager.create(OpUserRole, {
            opUserId: savedUser.id,
            roleId,
            assignedAdminId: operatorId,
          }),
        );
        await manager.save(userRoles);
      }

      this.logger.log(`创建运营用户: ${username}, ID: ${savedUser.id}`);
      return savedUser;
    });
  }

  /**
   * 更新运营用户信息
   */
  async updateOpUser(id: string, params: IUpdateOpUserParams): Promise<OpUser> {
    if (!id) throw new BizError('用户ID不能为空').codeAs(40001);

    const user = await this.opUserRepository.findOne({
      where: { id },
      relations: ['identity'],
    });
    if (!user) {
      throw new BizError('用户不存在').httpStatusAs(404).codeAs(40401);
    }

    const { name, phone, deptId, isSuper, enable, operatorId } = params;

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (deptId !== undefined) {
      if (deptId === '') {
        const defaultDept = await this.findDefaultOpDept();
        if (!defaultDept) {
          throw new BizError('未找到默认部门').codeAs(40404);
        }
        user.deptId = defaultDept.id;
      } else {
        user.deptId = deptId === null ? null : deptId;
      }
    }
    if (isSuper !== undefined) user.isSuper = isSuper;
    if (enable !== undefined) {
      user.status =
        enable === 'disabled'
          ? ObjectActiveStatus.DISABLED
          : ObjectActiveStatus.ACTIVE;
      // 同步禁用状态到 identity.status
      if (user.identity) {
        user.identity.status =
          enable === 'disabled'
            ? ObjectActiveStatus.DISABLED
            : ObjectActiveStatus.ACTIVE;
      }
    }
    if (operatorId) user.updatedBy = operatorId;

    // 先保存 identity（如果存在）
    if (user.identity) {
      await this.identityRepository.save(user.identity);
    }
    const result = await this.opUserRepository.save(user);

    // 用户信息变更后清除权限缓存
    await this.permissionService.clearUserPermissionCache(id);

    return result;
  }

  /**
   * 删除运营用户
   */
  async deleteOpUser(id: string, operatorId?: string): Promise<void> {
    if (!id) throw new BizError('用户ID不能为空').codeAs(40001);

    const user = await this.opUserRepository.findOne({
      where: { id },
      relations: ['identity'],
    });
    if (!user) {
      throw new BizError('用户不存在').httpStatusAs(404).codeAs(40401);
    }

    // 记录删除人并保存
    if (operatorId) {
      user.updatedBy = operatorId;
      await this.opUserRepository.save(user);
    }

    // 使用软删除
    await this.opUserRepository.softDelete(id);
    if (user.identityId) {
      await this.identityRepository.softDelete(user.identityId);
    }

    this.logger.log(`删除运营用户: ID: ${id}`);
  }

  /**
   * 分页查询运营用户
   */
  async findOpUserPage(
    queryParams: IOpUserQueryParams,
    page: number,
    pageSize: number,
  ): Promise<IPageData<OpUser>> {
    const { name, phone, deptId, enable } = queryParams;

    const qb = this.opUserRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.identity', 'identity')
      .leftJoinAndSelect('identity.opAccount', 'opAccount')
      .leftJoinAndSelect('user.dept', 'dept')
      .leftJoinAndSelect('user.creator', 'creator')
      .leftJoinAndSelect('creator.opAccount', 'creatorAccount')
      .leftJoinAndSelect('user.roles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .leftJoinAndSelect('userRoles.assignedBy', 'assignedBy')
      .leftJoinAndSelect('assignedBy.opAccount', 'assignedByAccount')
      .orderBy('user.createdAt', 'DESC');

    if (name) {
      qb.andWhere('user.name LIKE :name', { name: `%${name}%` });
    }
    if (phone) {
      qb.andWhere('user.phone LIKE :phone', { phone: `%${phone}%` });
    }
    if (deptId) {
      qb.andWhere('user.deptId = :deptId', { deptId });
    }
    if (enable) {
      qb.andWhere('user.status = :status', {
        status:
          enable === 'disabled'
            ? ObjectActiveStatus.DISABLED
            : ObjectActiveStatus.ACTIVE,
      });
    }

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { rows, total, page, pageSize };
  }

  /**
   * 获取用户详情
   */
  async findOpUserDetail(id: string): Promise<OpUser> {
    const user = await this.opUserRepository.findOne({
      where: { id },
      relations: [
        'identity',
        'identity.opAccount',
        'dept',
        'roles',
        'roles.role',
        'roles.assignedBy',
        'roles.assignedBy.opAccount',
        'creator',
        'creator.opAccount',
      ],
    });
    if (!user) {
      throw new BizError('用户不存在').httpStatusAs(404).codeAs(40401);
    }
    return user;
  }

  /**
   * 设置用户角色
   */
  async setUserRoles(
    userId: string,
    roleIds: string[],
    assignerId?: string,
  ): Promise<void> {
    if (!userId) throw new BizError('用户ID不能为空').codeAs(40001);

    const user = await this.opUserRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BizError('用户不存在').httpStatusAs(404).codeAs(40401);
    }

    await this.dataSource.transaction(async (manager) => {
      // 删除现有角色
      await manager.delete(OpUserRole, { opUserId: userId });

      // 添加新角色
      if (roleIds && roleIds.length > 0) {
        const userRoles = roleIds
          .filter((id) => !!id) // 过滤掉空的角色ID
          .map((roleId) =>
            manager.create(OpUserRole, {
              opUserId: userId,
              roleId,
              assignedAdminId: assignerId,
            }),
          );
        if (userRoles.length > 0) {
          await manager.save(userRoles);
        }
      }
    });

    this.logger.log(`用户 ${userId} 角色已更新，共 ${roleIds.length} 个角色`);

    // 用户角色变更后清除权限缓存
    await this.permissionService.clearUserPermissionCache(userId);
  }

  /**
   * 获取用户角色
   */
  async getUserRoles(userId: string): Promise<OpUserRole[]> {
    if (!userId) throw new BizError('用户ID不能为空').codeAs(40001);

    return await this.opUserRoleRepository.find({
      where: { opUserId: userId },
      relations: ['role'],
    });
  }

  /**
   * 获取运营用户列表 (用于翻译和选择)
   */
  async getOpUserListPublic(
    keyword?: string,
    limit: number = 10,
  ): Promise<{ id: string; name?: string; phone?: string }[]> {
    const qb = this.opUserRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.name', 'user.phone']);

    if (keyword) {
      qb.andWhere('(user.name LIKE :keyword OR user.phone LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    qb.andWhere('user.deletedAt IS NULL');
    qb.take(limit);

    return await qb.getMany();
  }

  /**
   * 私有方法: 查找默认部门
   * 策略: 优先查找 isDefault=true 的部门,否则返回创建时间最早的部门
   */
  private async findDefaultOpDept(): Promise<OpDept | null> {
    // 1. 尝试查找标记为默认的部门
    const defaultDept = await this.opDeptRepository.findOne({
      where: { isDefault: true },
    });

    if (defaultDept) {
      return defaultDept;
    }

    // 2. 如果没有标记的默认部门,返回创建时间最早的部门
    const depts = await this.opDeptRepository.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    return depts[0] || null;
  }
}
