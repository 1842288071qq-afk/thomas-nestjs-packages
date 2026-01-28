import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OpUser } from '@app/entities/op-account/op-user.entity';
import { OpUserRole } from '@app/entities/core/common-business/op-user-role.entity';
import { OpAccount } from '@app/entities/core/account/op-account.entity';
import { Identity, AccountSource, IdentityType } from '@app/entities/auth';
import { OpAccountCredential } from '@app/entities/core/account/op-account-credential.entity';
import { BizError } from '@app/core/BizError';
import { IPageData } from '@app/core/Pagination';
import { PasswordUtil } from '@app/common/utils/password';
import { OpDept } from '@app/entities/core/common-business/op-dept.entity';

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

  constructor(
    @InjectRepository(OpUser)
    private readonly opUserRepository: Repository<OpUser>,
    @InjectRepository(OpUserRole)
    private readonly opUserRoleRepository: Repository<OpUserRole>,
    @InjectRepository(OpAccount)
    private readonly opAccountRepository: Repository<OpAccount>,
    @InjectRepository(Identity)
    private readonly identityRepository: Repository<Identity>,
    @InjectRepository(OpAccountCredential)
    private readonly opAccountCredentialRepository: Repository<OpAccountCredential>,
    @InjectRepository(OpDept)
    private readonly opDeptRepository: Repository<OpDept>,
    private readonly dataSource: DataSource,
    private readonly passwordUtil: PasswordUtil,
  ) {}

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
        status: 'active',
      });
      const savedAccount = await manager.save(account);

      // 2. 创建身份
      const identity = manager.create(Identity, {
        accountId: savedAccount.id,
        accountSource: AccountSource.OP_ACCOUNT,
        identityType: IdentityType.OP_USER,
        status: 'active',
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
        status: 'active',
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
        enable: enable || 'enabled',
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
      user.enable = enable;
      // 同步禁用状态到 identity.status
      if (user.identity) {
        user.identity.status = enable === 'disabled' ? 'inactive' : 'active';
      }
    }
    if (operatorId) user.updatedBy = operatorId;

    // 先保存 identity（如果存在）
    if (user.identity) {
      await this.identityRepository.save(user.identity);
    }
    return await this.opUserRepository.save(user);
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
      qb.andWhere('user.enable = :enable', { enable });
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
    return await this.opDeptRepository.findOne({
      order: { createdAt: 'ASC' },
    });
  }
}
