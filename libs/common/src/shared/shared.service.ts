import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ObjectLiteral, FindOptionsWhere } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@app/core/nest/cache/cache.service';

import { Account } from '@app/entities/core/account/account.entity';
import { OpAccount } from '@app/entities/core/account/op-account.entity';

@Injectable()
export class SharedService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(OpAccount)
    private readonly opAccountRepository: Repository<OpAccount>,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  // 这里的方法会把identity下的业务用户加载出来

  private readonly khyAccountRelations: string[] = [
    'identities',
    'identities.hospitalAdmin',
    'identities.hospitalAdmin.hospital',
    'identities.student',
    'identities.student.hospital',
    'identities.personalUser',
    'profile',
  ];

  private readonly yyptAccountRelations: string[] = [
    'identities',
    'identities.opUser',
    'identities.opUser.roles',
    'identities.opUser.roles.role',
    'identities.opAgentUser',
    'profile',
  ];

  private async findAccountByIdInternal<T extends ObjectLiteral>(
    id: string,
    repository: Repository<T>,
    relations: string[],
  ): Promise<T | null> {
    return repository.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
      relations,
    });
  }

  async findAccountById<T = Account | OpAccount>(
    id: string,
  ): Promise<T | null> {
    const appName = this.configService.get<string>('app.name');
    if (appName === 'yypt') {
      return (await this.findAccountByIdForYypt(id)) as T;
    }
    return (await this.findAccountByIdForKhy(id)) as T;
  }

  accountInfoKey(id: string, type: 'yypt' | 'hky') {
    return `account:${type}:info_by_id:${id}`;
  }
  /**
   * 跳转各端应用方法
   */

  async findAccountByIdForKhy(id: string): Promise<Account | null> {
    return this.cacheService.wrap(
      {
        key: this.accountInfoKey(id, 'hky'),
        unless: (r) => !r,
      },
      () =>
        this.findAccountByIdInternal(
          id,
          this.accountRepository,
          this.khyAccountRelations,
        ),
    );
  }

  async findAccountByIdForYypt(id: string): Promise<OpAccount | null> {
    return await this.cacheService.wrap(
      {
        key: this.accountInfoKey(id, 'yypt'),
        unless: (r) => !r,
      },
      () =>
        this.findAccountByIdInternal(
          id,
          this.opAccountRepository,
          this.yyptAccountRelations,
        ),
    );
  }

  async clearAccountCache(accountId: string): Promise<void> {
    const keys = [
      this.accountInfoKey(accountId, 'hky'),
      this.accountInfoKey(accountId, 'yypt'),
    ];
    await this.cacheService.evictMany(keys);
  }
}
