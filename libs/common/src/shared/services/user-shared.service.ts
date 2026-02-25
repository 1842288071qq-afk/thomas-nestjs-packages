import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BizError } from '@thomas/nestjs/core/BizError';
import { IPageData } from '@thomas/nestjs/core/Pagination';
import { PasswordUtil } from '@thomas/nestjs/common/utils/password';
import {
  Account,
  AccountCredential,
  AccountSource,
  Identity,
  IdentityType,
  ObjectActiveStatus,
  User,
} from '@thomas/nestjs/entities';

export interface ICreateUserParams {
  username: string;
  password: string;
  name?: string;
  phone?: string;
  enable?: string;
}

export interface IUpdateUserParams {
  name?: string;
  phone?: string;
  enable?: string;
  operatorId?: string;
}

export interface IUserQueryParams {
  name?: string;
  phone?: string;
  enable?: string;
}

@Injectable()
export class UserSharedService {
  private readonly logger = new Logger(UserSharedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Identity)
    private readonly identityRepository: Repository<Identity>,
    private readonly dataSource: DataSource,
    private readonly passwordUtil: PasswordUtil,
  ) {}

  async createUser(
    params: ICreateUserParams,
    operatorId?: string,
  ): Promise<User> {
    const { username, password, name, phone, enable } = params;

    if (!username) throw new BizError('用户名不能为空').codeAs(40001);
    if (!password) throw new BizError('密码不能为空').codeAs(40002);

    const existingAccount = await this.accountRepository.findOne({
      where: { username },
    });
    if (existingAccount) {
      throw new BizError('用户名已存在').httpStatusAs(409).codeAs(40901);
    }

    return await this.dataSource.transaction(async (manager) => {
      const account = manager.create(Account, {
        username,
        phone: undefined,
        nickname: name,
        realName: name,
        status: ObjectActiveStatus.ACTIVE,
      });
      const savedAccount = await manager.save(account);

      const identity = manager.create(Identity, {
        accountId: savedAccount.id,
        accountSource: AccountSource.ACCOUNT,
        identityType: IdentityType.User,
        status: ObjectActiveStatus.ACTIVE,
      });
      const savedIdentity = await manager.save(identity);

      const { hash, salt } = this.passwordUtil.hashPassword(password);
      const credential = manager.create(AccountCredential, {
        accountId: savedAccount.id,
        type: 'password',
        identifier: username,
        secret: hash,
        salt,
        isPrimary: true,
        status: ObjectActiveStatus.ACTIVE,
      });
      await manager.save(credential);

      const user = manager.create(User, {
        identityId: savedIdentity.id,
        name: name || username,
        phone,
        status:
          enable === 'disabled'
            ? ObjectActiveStatus.DISABLED
            : ObjectActiveStatus.ACTIVE,
        createdBy: operatorId,
      });
      const savedUser = await manager.save(user);

      this.logger.log(`创建普通用户: ${username}, ID: ${savedUser.id}`);
      return savedUser;
    });
  }

  async updateUser(id: string, params: IUpdateUserParams): Promise<User> {
    if (!id) throw new BizError('用户ID不能为空').codeAs(40001);

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['identity'],
    });
    if (!user) {
      throw new BizError('用户不存在').httpStatusAs(404).codeAs(40401);
    }

    const { name, phone, enable, operatorId } = params;

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (enable !== undefined) {
      user.status =
        enable === 'disabled'
          ? ObjectActiveStatus.DISABLED
          : ObjectActiveStatus.ACTIVE;
      if (user.identity) {
        user.identity.status =
          enable === 'disabled'
            ? ObjectActiveStatus.DISABLED
            : ObjectActiveStatus.ACTIVE;
      }
    }
    if (operatorId) user.updatedBy = operatorId;

    if (user.identity) {
      await this.identityRepository.save(user.identity);
    }

    return await this.userRepository.save(user);
  }

  async deleteUser(id: string, operatorId?: string): Promise<void> {
    if (!id) throw new BizError('用户ID不能为空').codeAs(40001);

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['identity'],
    });
    if (!user) {
      throw new BizError('用户不存在').httpStatusAs(404).codeAs(40401);
    }

    if (operatorId) {
      user.updatedBy = operatorId;
      await this.userRepository.save(user);
    }

    await this.userRepository.softDelete(id);
    if (user.identityId) {
      await this.identityRepository.softDelete(user.identityId);
    }

    this.logger.log(`删除普通用户: ID: ${id}`);
  }

  async findUserPage(
    queryParams: IUserQueryParams,
    page: number,
    pageSize: number,
  ): Promise<IPageData<User>> {
    const { name, phone, enable } = queryParams;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.identity', 'identity')
      .leftJoinAndSelect('identity.account', 'account')
      .leftJoinAndSelect('user.creator', 'creator')
      .leftJoinAndSelect('creator.account', 'creatorAccount')
      .leftJoinAndSelect('creator.opAccount', 'creatorOpAccount')
      .orderBy('user.createdAt', 'DESC');

    if (name) {
      qb.andWhere('user.name LIKE :name', { name: `%${name}%` });
    }
    if (phone) {
      qb.andWhere('user.phone LIKE :phone', { phone: `%${phone}%` });
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

  async findUserDetail(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: [
        'identity',
        'identity.account',
        'creator',
        'creator.account',
        'creator.opAccount',
      ],
    });
    if (!user) {
      throw new BizError('用户不存在').httpStatusAs(404).codeAs(40401);
    }
    return user;
  }

  async getUserListPublic(
    keyword?: string,
    limit: number = 10,
  ): Promise<{ id: string; name?: string; phone?: string }[]> {
    const qb = this.userRepository
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
}
