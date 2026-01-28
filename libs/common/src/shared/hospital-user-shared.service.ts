import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, IsNull, SelectQueryBuilder } from 'typeorm';
import { Account } from '@app/entities/core/account/account.entity';
import { AccountCredential } from '@app/entities/core/account/account-credential.entity';
import { HospitalAdmin } from '@app/entities/account/hospital-admin.entity';
import { Student } from '@app/entities/account/student.entity';
import { Identity, AccountSource, IdentityType } from '@app/entities/auth';
import { BizError } from '@app/core/BizError';
import { PasswordUtil } from '@app/common/utils/password';
import { HospitalDept } from '@app/entities/auth/hospital-dept.entity';
import { IPageData } from '@app/core/Pagination';
import { SharedService } from './shared.service';

export interface IManageHospitalAdminParams {
  id?: string;
  name?: string;
  phone?: string;
  username?: string;
  password?: string;
  deptId?: string | null;
  isSuperAdmin?: boolean;
  enable?: string;
  jobTitle?: string;
  jobPosition?: string;
  jobTime?: string | Date;
  operatorId?: string;
}

export interface IManageStudentParams {
  id?: string;
  name?: string;
  phone?: string;
  username?: string;
  password?: string;
  deptId?: string | null;
  jobTitle?: string;
  jobPosition?: string;
  jobTime?: string | Date;
  enable?: string;
  operatorId?: string;
}

@Injectable()
export class HospitalUserSharedService {
  private readonly logger = new Logger(HospitalUserSharedService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Identity)
    private readonly identityRepository: Repository<Identity>,
    @InjectRepository(AccountCredential)
    private readonly credentialRepository: Repository<AccountCredential>,
    @InjectRepository(HospitalAdmin)
    private readonly adminRepository: Repository<HospitalAdmin>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(HospitalDept)
    private readonly deptRepository: Repository<HospitalDept>,
    private readonly passwordUtil: PasswordUtil,
    private readonly sharedService: SharedService,
  ) {}

  /**
   * 确保账号存在，并返回对应身份 (用于创建逻辑)
   * 1. 根据 username 查找账号
   * 2. 如果账号已存在，校验是否存在该医院身份
   * 3. 如果已存在，抛出异常
   * 4. 如果账号不存在，创建账号 (phone 强制为空)
   */
  private async ensureHospitalIdentityForCreate(
    params: {
      name: string;
      username: string;
      password?: string;
      identityType: IdentityType.HOSPITAL_ADMIN | IdentityType.STUDENT;
      operatorId?: string;
    },
    hospitalId: string,
    manager: EntityManager,
  ): Promise<{
    identity: Identity;
    businessRecord?: HospitalAdmin | Student;
    restored: boolean;
  }> {
    const { name, username, password, identityType, operatorId } = params;

    // 1. 查找账号 (仅通过 username)
    let account = await manager.findOne(Account, {
      where: { username },
    });

    if (account) {
      // 2. 账号存在，检查本医院下的身份
      // 查找该账号下属于当前医院的业务记录，包含已软删除的记录和身份
      let businessRecord: HospitalAdmin | Student | null;
      if (identityType === IdentityType.HOSPITAL_ADMIN) {
        businessRecord = await manager.findOne(HospitalAdmin, {
          where: {
            hospitalId,
            identity: {
              accountId: account.id,
            },
          },
          relations: ['identity'],
          withDeleted: true,
        });
      } else {
        businessRecord = await manager.findOne(Student, {
          where: {
            hospitalId,
            identity: {
              accountId: account.id,
            },
          },
          relations: ['identity'],
          withDeleted: true,
        });
      }

      if (businessRecord) {
        const identity = await manager.findOne(Identity, {
          where: { id: businessRecord.identityId },
          withDeleted: true,
        });

        if (!identity) {
          throw new BizError('该账号已存在医院身份，请勿重复添加').codeAs(
            40005,
          );
        }

        const isBusinessDeleted = !!businessRecord.deletedAt;
        const isIdentityDeleted = !!identity.deletedAt;

        if (!isBusinessDeleted && !isIdentityDeleted) {
          throw new BizError('该账号已存在医院身份，请勿重复添加').codeAs(
            40005,
          );
        }

        if (isBusinessDeleted && isIdentityDeleted) {
          // 使用 TypeORM restore 确保软删除标志被正确清除
          await manager.restore(Identity, identity.id);
          if (identityType === IdentityType.HOSPITAL_ADMIN) {
            await manager.restore(HospitalAdmin, businessRecord.id);
          } else {
            await manager.restore(Student, businessRecord.id);
          }

          // 重新加载已恢复的 identity（可选）并设置状态
          const restoredIdentity = await manager.findOne(Identity, {
            where: { id: identity.id },
          });
          if (restoredIdentity) {
            restoredIdentity.status = 'active';
            await manager.save(restoredIdentity);
          }

          // 确保业务记录 deletedAt 清空并更新 updatedBy/updatedAt
          businessRecord.deletedAt = null;
          if (operatorId) {
            businessRecord.updatedBy = operatorId;
          }
          await manager.save(businessRecord);

          return {
            identity: restoredIdentity || identity,
            businessRecord,
            restored: true,
          };
        }

        throw new BizError('该账号已存在医院身份，请勿重复添加').codeAs(40005);
      }
    } else {
      // 3. 创建新账号
      account = manager.create(Account, {
        username,
        phone: undefined, // 强制为空
        status: 'active',
        realName: name,
      });
      await manager.save(account);

      // 创建密码凭证
      if (password) {
        const hashedPassword = this.passwordUtil.hashPassword(password);
        const credential = manager.create(AccountCredential, {
          accountId: account.id,
          type: 'password',
          identifier: username,
          secret: hashedPassword.hash,
          salt: hashedPassword.salt,
        });
        await manager.save(credential);
      }
    }

    // 4. 创建身份
    const identity = manager.create(Identity, {
      accountId: account.id,
      accountSource: AccountSource.ACCOUNT,
      identityType,
      status: 'active',
    });
    await manager.save(identity);

    return { identity, restored: false };
  }

  /**
   * 创建医院管理员
   */
  async createHospitalAdmin(
    hospitalId: string,
    params: IManageHospitalAdminParams,
    manager?: EntityManager,
  ): Promise<HospitalAdmin> {
    if (!hospitalId) {
      throw new BizError('医院ID不能为空').codeAs(40001);
    }
    if (!params.name) throw new BizError('管理员姓名不能为空').codeAs(40002);
    if (!params.username)
      throw new BizError('管理员账号不能为空').codeAs(40003);

    const em = manager || this.adminRepository.manager;

    return await em.transaction(async (trx) => {
      const {
        name,
        username,
        password,
        deptId,
        isSuperAdmin,
        enable,
        jobTitle,
        jobPosition,
        jobTime,
        operatorId,
        phone,
      } = params;

      const { identity, businessRecord, restored } =
        await this.ensureHospitalIdentityForCreate(
          {
            name: name!,
            username: username!,
            password,
            identityType: IdentityType.HOSPITAL_ADMIN,
            operatorId,
          },
          hospitalId,
          trx,
        );

      // 处理空字符串 deptId,设置为默认部门
      let finalDeptId = deptId;
      if (!finalDeptId) {
        const defaultDept = await trx.findOne(HospitalDept, {
          where: { hospitalId, isDefault: true },
        });
        if (!defaultDept) {
          throw new BizError('未找到默认部门').codeAs(40404);
        }
        finalDeptId = defaultDept.id;
      }

      let admin: HospitalAdmin;
      if (restored && businessRecord) {
        admin = businessRecord as HospitalAdmin;
        admin.name = name!;
        admin.phone = phone;
        admin.deptId = finalDeptId === null ? null : finalDeptId;
        admin.isSuperAdmin = !!isSuperAdmin;
        admin.enable = enable || 'enabled';
        admin.jobTitle = jobTitle;
        admin.jobPosition = jobPosition;
        admin.jobTime = jobTime ? new Date(jobTime) : undefined;
        if (operatorId) {
          admin.updatedBy = operatorId;
        }
      } else {
        admin = trx.create(HospitalAdmin, {
          hospitalId,
          identityId: identity.id,
          name,
          phone,
          deptId: finalDeptId === null ? null : finalDeptId,
          isSuperAdmin: !!isSuperAdmin,
          enable: enable || 'enabled',
          jobTitle,
          jobPosition,
          jobTime: jobTime ? new Date(jobTime) : undefined,
          createdBy: operatorId,
          updatedBy: operatorId,
        });
      }

      const result = await trx.save(admin);
      if (!result) throw new BizError('保存管理员失败').codeAs(50001);

      // 清除账号缓存
      await this.sharedService.clearAccountCache(identity.accountId);

      return result;
    });
  }

  /**
   * 更新医院管理员
   */
  async updateHospitalAdmin(
    hospitalId: string,
    id: string,
    params: Omit<IManageHospitalAdminParams, 'id' | 'username' | 'password'>,
    manager?: EntityManager,
  ): Promise<HospitalAdmin> {
    if (!id) throw new BizError('ID不能为空').codeAs(40004);

    const em = manager || this.adminRepository.manager;

    return await em.transaction(async (trx) => {
      const {
        name,
        deptId,
        isSuperAdmin,
        enable,
        jobTitle,
        jobPosition,
        jobTime,
        operatorId,
        phone,
      } = params;

      const admin = await trx.findOne(HospitalAdmin, {
        where: { id },
        relations: ['identity'],
      });

      if (!admin) throw new BizError('管理员不存在').codeAs(40400);
      if (hospitalId && admin.hospitalId !== hospitalId) {
        throw new BizError('无权操作该医院的管理员').codeAs(40301);
      }

      if (name !== undefined) admin.name = name;
      if (deptId !== undefined) {
        if (deptId === '') {
          const defaultDept = await trx.findOne(HospitalDept, {
            where: { hospitalId, isDefault: true },
          });
          if (!defaultDept) {
            throw new BizError('未找到默认部门').codeAs(40404);
          }
          admin.deptId = defaultDept.id;
        } else {
          admin.deptId = deptId === null ? null : deptId;
        }
      }
      if (isSuperAdmin !== undefined) admin.isSuperAdmin = isSuperAdmin;
      if (enable !== undefined) {
        admin.enable = enable;
        // 同步禁用状态到 identity.status
        admin.identity.status = enable === 'disabled' ? 'inactive' : 'active';
      }
      if (jobTitle !== undefined) admin.jobTitle = jobTitle;
      if (jobPosition !== undefined) admin.jobPosition = jobPosition;
      if (jobTime !== undefined)
        admin.jobTime = jobTime ? new Date(jobTime) : undefined;
      if (phone !== undefined) admin.phone = phone;

      if (operatorId) {
        admin.updatedBy = operatorId;
      }

      await trx.save(admin.identity);
      const result = await trx.save(admin);
      if (!result) throw new BizError('保存管理员失败').codeAs(50001);

      // 清除账号缓存
      await this.sharedService.clearAccountCache(admin.identity.accountId);

      return result;
    });
  }

  /**
   * 创建学生
   */
  async createStudent(
    hospitalId: string,
    params: IManageStudentParams,
    manager?: EntityManager,
  ): Promise<Student> {
    if (!hospitalId) {
      throw new BizError('医院ID不能为空').codeAs(40001);
    }
    if (!params.name) throw new BizError('学生姓名不能为空').codeAs(40002);
    if (!params.username) throw new BizError('学生账号不能为空').codeAs(40003);

    const em = manager || this.studentRepository.manager;

    return await em.transaction(async (trx) => {
      const {
        name,
        username,
        password,
        deptId,
        jobTitle,
        jobPosition,
        jobTime,
        enable,
        operatorId,
        phone,
      } = params;

      const { identity, businessRecord, restored } =
        await this.ensureHospitalIdentityForCreate(
          {
            name: name!,
            username: username!,
            password,
            identityType: IdentityType.STUDENT,
            operatorId,
          },
          hospitalId,
          trx,
        );

      // 处理空字符串 deptId,设置为默认部门
      let finalDeptId = deptId;
      if (!finalDeptId) {
        const defaultDept = await trx.findOne(HospitalDept, {
          where: { hospitalId, isDefault: true },
        });
        if (!defaultDept) {
          throw new BizError('未找到默认部门').codeAs(40404);
        }
        finalDeptId = defaultDept.id;
      }

      let student: Student;
      if (restored && businessRecord) {
        student = businessRecord as Student;
        student.name = name!;
        student.phone = phone;
        student.deptId = finalDeptId === null ? null : finalDeptId;
        student.jobTitle = jobTitle;
        student.jobPosition = jobPosition;
        student.jobTime = jobTime ? new Date(jobTime) : undefined;
        student.enable = enable || 'enabled';
        if (operatorId) {
          student.updatedBy = operatorId;
        }
      } else {
        student = trx.create(Student, {
          hospitalId,
          identityId: identity.id,
          name,
          phone,
          deptId: finalDeptId === null ? null : finalDeptId,
          jobTitle,
          jobPosition,
          jobTime: jobTime ? new Date(jobTime) : undefined,
          enable: enable || 'enabled',
          createdBy: operatorId,
          updatedBy: operatorId,
        });
      }

      const result = await trx.save(student);
      if (!result) throw new BizError('保存学生失败').codeAs(50001);

      // 清除账号缓存
      await this.sharedService.clearAccountCache(identity.accountId);

      return result;
    });
  }

  /**
   * 更新学生
   */
  async updateStudent(
    hospitalId: string,
    id: string,
    params: Omit<IManageStudentParams, 'id' | 'username' | 'password'>,
    manager?: EntityManager,
  ): Promise<Student> {
    if (!id) throw new BizError('ID不能为空').codeAs(40004);

    const em = manager || this.studentRepository.manager;

    return await em.transaction(async (trx) => {
      const {
        name,
        deptId,
        jobTitle,
        jobPosition,
        jobTime,
        enable,
        operatorId,
        phone,
      } = params;

      const student = await trx.findOne(Student, {
        where: { id },
        relations: ['identity'],
      });

      if (!student) throw new BizError('学生不存在').codeAs(40400);
      if (hospitalId && student.hospitalId !== hospitalId) {
        throw new BizError('无权操作该医院的学生').codeAs(40301);
      }

      if (name !== undefined) student.name = name;
      if (deptId !== undefined) {
        if (deptId === '') {
          const defaultDept = await trx.findOne(HospitalDept, {
            where: { hospitalId, isDefault: true },
          });
          if (!defaultDept) {
            throw new BizError('未找到默认部门').codeAs(40404);
          }
          student.deptId = defaultDept.id;
        } else {
          student.deptId = deptId === null ? null : deptId;
        }
      }
      if (jobTitle !== undefined) student.jobTitle = jobTitle;
      if (jobPosition !== undefined) student.jobPosition = jobPosition;
      if (jobTime !== undefined)
        student.jobTime = jobTime ? new Date(jobTime) : undefined;
      if (enable !== undefined) {
        student.enable = enable;
        // 同步禁用状态到 identity.status
        student.identity.status = enable === 'disabled' ? 'inactive' : 'active';
      }
      if (phone !== undefined) student.phone = phone;

      if (operatorId) {
        student.updatedBy = operatorId;
      }

      await trx.save(student.identity);
      const result = await trx.save(student);
      if (!result) throw new BizError('保存学生失败').codeAs(50001);

      // 清除账号缓存
      await this.sharedService.clearAccountCache(student.identity.accountId);

      return result;
    });
  }

  /**
   * 删除业务用户 (仅删除 Identity 和 业务记录，保留 Account)
   */
  async deleteHospitalUser(
    type: 'hospital_admin' | 'student',
    id: string,
    operatorId?: string,
    manager?: EntityManager,
  ): Promise<void> {
    const em = manager || this.adminRepository.manager;

    await em.transaction(async (trx) => {
      let identityId: string;
      let accountId: string | undefined;

      if (type === 'hospital_admin') {
        const admin = await trx.findOne(HospitalAdmin, {
          where: { id },
          relations: ['identity'],
        });
        if (!admin) return;
        identityId = admin.identityId;
        accountId = admin.identity?.accountId;

        if (operatorId) {
          admin.updatedBy = operatorId;
          await trx.save(admin);
        }
        await trx.softRemove(admin);
      } else {
        const student = await trx.findOne(Student, {
          where: { id },
          relations: ['identity'],
        });
        if (!student) return;
        identityId = student.identityId;
        accountId = student.identity?.accountId;

        if (operatorId) {
          student.updatedBy = operatorId;
          await trx.save(student);
        }
        await trx.softRemove(student);
      }

      if (identityId) {
        await trx.softDelete(Identity, { id: identityId });
      }

      if (accountId) {
        // 清除账号缓存
        await this.sharedService.clearAccountCache(accountId);
      }
    });
  }

  /**
   * 应用通用的用户查询过滤条件
   */
  private async applyUserFilters(
    qb: SelectQueryBuilder<any>,
    alias: string,
    params: {
      hospitalId?: string;
      name?: string;
      username?: string;
      phone?: string;
      deptId?: string;
      enable?: string;
    },
  ) {
    const { hospitalId, name, username, phone, deptId, enable } = params;

    qb.where(`${alias}.deletedAt IS NULL`);

    if (hospitalId) {
      qb.andWhere(`${alias}.hospitalId = :hospitalId`, { hospitalId });
    }

    if (name) {
      qb.andWhere(`${alias}.name LIKE :name`, { name: `%${name}%` });
    }

    if (username) {
      qb.andWhere('account.username LIKE :username', {
        username: `%${username}%`,
      });
    }

    if (phone) {
      qb.andWhere(`${alias}.phone LIKE :phone`, { phone: `%${phone}%` });
    }

    if (deptId) {
      const dept = await this.deptRepository.findOne({ where: { id: deptId } });
      if (dept) {
        qb.andWhere(
          `(${alias}.deptId IN (SELECT id FROM hospital_dept WHERE id_path = :path OR id_path LIKE :pathPrefix))`,
          {
            path: dept.idPath,
            pathPrefix: `${dept.idPath},%`,
          },
        );
      }
    }

    if (enable) {
      qb.andWhere(`${alias}.enable = :enable`, { enable });
    }
  }

  /**
   * 分页查询医院管理员
   */
  async findHospitalAdminPage(params: {
    hospitalId?: string;
    name?: string;
    username?: string;
    phone?: string;
    deptId?: string;
    enable?: string;
    page: number;
    pageSize: number;
  }): Promise<IPageData<HospitalAdmin>> {
    const { page, pageSize } = params;

    if (!params.hospitalId) {
      throw new BizError('医院ID不能为空').codeAs(40001);
    }

    const qb = this.adminRepository
      .createQueryBuilder('admin')
      .leftJoinAndSelect('admin.identity', 'identity')
      .leftJoinAndSelect('identity.account', 'account')
      .leftJoinAndSelect('identity.hospitalAdmin', 'identityAdmin')
      .leftJoinAndSelect('identity.opUser', 'identityOpUser')
      .leftJoinAndSelect('identity.opAgentUser', 'identityAgentUser')
      .leftJoinAndSelect('admin.dept', 'dept')
      .leftJoinAndSelect('admin.roles', 'adminRoles')
      .leftJoinAndSelect('adminRoles.role', 'role')
      .leftJoinAndSelect('admin.creator', 'creator')
      .leftJoinAndSelect('creator.account', 'creatorAccount')
      .leftJoinAndSelect('creator.hospitalAdmin', 'creatorAdmin')
      .leftJoinAndSelect('creator.opUser', 'creatorOpUser')
      .leftJoinAndSelect('creator.opAgentUser', 'creatorAgentUser')
      .leftJoinAndSelect('admin.updater', 'updater')
      .leftJoinAndSelect('updater.account', 'updaterAccount')
      .leftJoinAndSelect('updater.hospitalAdmin', 'updaterAdmin')
      .leftJoinAndSelect('updater.opUser', 'updaterOpUser')
      .leftJoinAndSelect('updater.opAgentUser', 'updaterAgentUser');

    await this.applyUserFilters(qb, 'admin', params);

    const [rows, total] = await qb
      .orderBy('admin.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { rows, total, page, pageSize };
  }

  /**
   * 列表查询医院管理员
   */
  async findHospitalAdminList(params: {
    hospitalId: string;
    name?: string;
    username?: string;
    phone?: string;
    deptId?: string;
    enable?: string;
    limit?: number;
  }): Promise<HospitalAdmin[]> {
    const { limit } = params;

    const qb = this.adminRepository
      .createQueryBuilder('admin')
      .leftJoinAndSelect('admin.identity', 'identity')
      .leftJoinAndSelect('identity.account', 'account')
      .leftJoinAndSelect('identity.hospitalAdmin', 'identityAdmin')
      .leftJoinAndSelect('identity.opUser', 'identityOpUser')
      .leftJoinAndSelect('identity.opAgentUser', 'identityAgentUser')
      .leftJoinAndSelect('admin.dept', 'dept')
      .leftJoinAndSelect('admin.roles', 'adminRoles')
      .leftJoinAndSelect('adminRoles.role', 'role')
      .leftJoinAndSelect('admin.creator', 'creator')
      .leftJoinAndSelect('creator.account', 'creatorAccount')
      .leftJoinAndSelect('creator.hospitalAdmin', 'creatorAdmin')
      .leftJoinAndSelect('creator.opUser', 'creatorOpUser')
      .leftJoinAndSelect('creator.opAgentUser', 'creatorAgentUser')
      .leftJoinAndSelect('admin.updater', 'updater')
      .leftJoinAndSelect('updater.account', 'updaterAccount')
      .leftJoinAndSelect('updater.hospitalAdmin', 'updaterAdmin')
      .leftJoinAndSelect('updater.opUser', 'updaterOpUser')
      .leftJoinAndSelect('updater.opAgentUser', 'updaterAgentUser');

    await this.applyUserFilters(qb, 'admin', params);

    qb.orderBy('admin.createdAt', 'DESC');

    if (limit && limit > 0) {
      qb.take(limit);
    }

    return await qb.getMany();
  }

  /**
   * 分页查询学生
   */
  async findStudentPage(params: {
    hospitalId?: string;
    name?: string;
    username?: string;
    phone?: string;
    deptId?: string;
    enable?: string;
    page: number;
    pageSize: number;
  }): Promise<IPageData<Student>> {
    const { page, pageSize } = params;

    if (!params.hospitalId) {
      throw new BizError('医院ID不能为空').codeAs(40001);
    }

    const qb = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.identity', 'identity')
      .leftJoinAndSelect('identity.account', 'account')
      .leftJoinAndSelect('identity.hospitalAdmin', 'identityAdmin')
      .leftJoinAndSelect('identity.opUser', 'identityOpUser')
      .leftJoinAndSelect('identity.opAgentUser', 'identityAgentUser')
      .leftJoinAndSelect('student.dept', 'dept')
      .leftJoinAndSelect('student.creator', 'creator')
      .leftJoinAndSelect('creator.account', 'creatorAccount')
      .leftJoinAndSelect('creator.hospitalAdmin', 'creatorAdmin')
      .leftJoinAndSelect('creator.opUser', 'creatorOpUser')
      .leftJoinAndSelect('creator.opAgentUser', 'creatorAgentUser')
      .leftJoinAndSelect('student.updater', 'updater')
      .leftJoinAndSelect('updater.account', 'updaterAccount')
      .leftJoinAndSelect('updater.hospitalAdmin', 'updaterAdmin')
      .leftJoinAndSelect('updater.opUser', 'updaterOpUser')
      .leftJoinAndSelect('updater.opAgentUser', 'updaterAgentUser');

    await this.applyUserFilters(qb, 'student', params);

    const [rows, total] = await qb
      .orderBy('student.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { rows, total, page, pageSize };
  }

  /**
   * 列表查询学生
   */
  async findStudentList(params: {
    hospitalId: string;
    name?: string;
    username?: string;
    phone?: string;
    deptId?: string;
    enable?: string;
    limit?: number;
  }): Promise<Student[]> {
    const { limit } = params;

    const qb = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.identity', 'identity')
      .leftJoinAndSelect('identity.account', 'account')
      .leftJoinAndSelect('identity.hospitalAdmin', 'identityAdmin')
      .leftJoinAndSelect('identity.opUser', 'identityOpUser')
      .leftJoinAndSelect('identity.opAgentUser', 'identityAgentUser')
      .leftJoinAndSelect('student.dept', 'dept')
      .leftJoinAndSelect('student.creator', 'creator')
      .leftJoinAndSelect('creator.account', 'creatorAccount')
      .leftJoinAndSelect('creator.hospitalAdmin', 'creatorAdmin')
      .leftJoinAndSelect('creator.opUser', 'creatorOpUser')
      .leftJoinAndSelect('creator.opAgentUser', 'creatorAgentUser')
      .leftJoinAndSelect('student.updater', 'updater')
      .leftJoinAndSelect('updater.account', 'updaterAccount')
      .leftJoinAndSelect('updater.hospitalAdmin', 'updaterAdmin')
      .leftJoinAndSelect('updater.opUser', 'updaterOpUser')
      .leftJoinAndSelect('updater.opAgentUser', 'updaterAgentUser');

    await this.applyUserFilters(qb, 'student', params);

    qb.orderBy('student.createdAt', 'DESC');

    if (limit && limit > 0) {
      qb.take(limit);
    }

    return await qb.getMany();
  }

  /**
   * 获取医院管理员详情
   */
  async findHospitalAdminById(id: string): Promise<HospitalAdmin | null> {
    return await this.adminRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: [
        'identity',
        'identity.account',
        'identity.hospitalAdmin',
        'identity.opUser',
        'identity.opAgentUser',
        'dept',
        'roles',
        'roles.role',
        'creator',
        'creator.account',
        'creator.hospitalAdmin',
        'creator.opUser',
        'creator.opAgentUser',
        'updater',
        'updater.account',
        'updater.hospitalAdmin',
        'updater.opUser',
        'updater.opAgentUser',
      ],
    });
  }

  /**
   * 获取学生详情
   */
  async findStudentById(id: string): Promise<Student | null> {
    return await this.studentRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: [
        'identity',
        'identity.account',
        'identity.hospitalAdmin',
        'identity.opUser',
        'identity.opAgentUser',
        'dept',
        'creator',
        'creator.account',
        'creator.hospitalAdmin',
        'creator.opUser',
        'creator.opAgentUser',
        'updater',
        'updater.account',
        'updater.hospitalAdmin',
        'updater.opUser',
        'updater.opAgentUser',
      ],
    });
  }

  /**
   * 更新医院用户密码
   */
  async updateHospitalUserPassword(
    type: 'hospital_admin' | 'student',
    id: string,
    newPassword: string,
    operatorId?: string,
  ): Promise<void> {
    const adminOrStudent =
      type === 'hospital_admin'
        ? await this.adminRepository.findOne({
            where: { id },
            relations: ['identity'],
          })
        : await this.studentRepository.findOne({
            where: { id },
            relations: ['identity'],
          });

    if (!adminOrStudent) {
      throw new BizError('用户不存在').codeAs(40400);
    }

    if (operatorId) {
      adminOrStudent.updatedBy = operatorId;
      if (type === 'hospital_admin') {
        await this.adminRepository.save(adminOrStudent as HospitalAdmin);
      } else {
        await this.studentRepository.save(adminOrStudent as Student);
      }
    }

    const identityId = adminOrStudent.identityId;
    const identity = await this.identityRepository.findOne({
      where: { id: identityId },
    });
    if (!identity) throw new BizError('身份信息不存在');

    const accountId = identity.accountId;
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
    });
    if (!account) throw new BizError('账号不存在');

    // 查找密码凭证
    let credential = await this.credentialRepository.findOne({
      where: { accountId, type: 'password' },
    });

    const hashedPassword = this.passwordUtil.hashPassword(newPassword);

    if (credential) {
      credential.secret = hashedPassword.hash;
      credential.salt = hashedPassword.salt;
    } else {
      credential = this.credentialRepository.create({
        accountId,
        type: 'password',
        identifier: account.username,
        secret: hashedPassword.hash,
        salt: hashedPassword.salt,
      });
    }

    await this.credentialRepository.save(credential);

    // 清空账号缓存
    await this.sharedService.clearAccountCache(accountId);
  }

  /**
   * 获取管理员详情
   */
  async findOneAdmin(hospitalId: string, id: string): Promise<HospitalAdmin> {
    const admin = await this.adminRepository.findOne({
      where: { id, hospitalId },
      relations: [
        'identity',
        'identity.account',
        'identity.hospitalAdmin',
        'identity.opUser',
        'identity.opAgentUser',
        'dept',
        'roles',
        'roles.role',
        'creator',
        'creator.account',
        'creator.hospitalAdmin',
        'creator.opUser',
        'creator.opAgentUser',
        'updater',
        'updater.account',
        'updater.hospitalAdmin',
        'updater.opUser',
        'updater.opAgentUser',
      ],
    });
    if (!admin) throw new BizError('管理员不存在').codeAs(40400);
    return admin;
  }

  /**
   * 获取学生详情
   */
  async findOneStudent(hospitalId: string, id: string): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id, hospitalId },
      relations: [
        'identity',
        'identity.account',
        'identity.hospitalAdmin',
        'identity.opUser',
        'identity.opAgentUser',
        'dept',
        'creator',
        'creator.account',
        'creator.hospitalAdmin',
        'creator.opUser',
        'creator.opAgentUser',
        'updater',
        'updater.account',
        'updater.hospitalAdmin',
        'updater.opUser',
        'updater.opAgentUser',
      ],
    });
    if (!student) throw new BizError('学生不存在').codeAs(40400);
    return student;
  }

  /**
   * 获取医院用户统计信息
   */
  async getHospitalUserStatistics(hospitalId: string): Promise<{
    superAdminCount: number;
    adminCount: number;
    studentCount: number;
  }> {
    const superAdminCount = await this.adminRepository.count({
      where: {
        hospitalId,
        isSuperAdmin: true,
        deletedAt: IsNull(),
      },
    });

    const adminCount = await this.adminRepository.count({
      where: {
        hospitalId,
        isSuperAdmin: false,
        deletedAt: IsNull(),
      },
    });

    const studentCount = await this.studentRepository.count({
      where: {
        hospitalId,
        deletedAt: IsNull(),
      },
    });

    return {
      superAdminCount,
      adminCount,
      studentCount,
    };
  }
}
