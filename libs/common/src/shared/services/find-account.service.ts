import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { CacheService } from '@thomas/nestjs/core/nest/cache/cache.service';

import { Account } from '@thomas/nestjs/entities/core/account/account.entity';
import { OpAccount } from '@thomas/nestjs/entities/core/account/op-account.entity';
import {
  ACCOUNT_RELATIONS,
  OP_ACCOUNT_RELATIONS,
} from './account-relations.config';

type AccountType = Account | OpAccount;

@Injectable()
export class FindAccountService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(OpAccount)
    private readonly opAccountRepository: Repository<OpAccount>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 根据账号ID查询账号信息（优先查询 Account，不存在则查询 OpAccount）
   * @param id 账号ID
   * @returns Account | OpAccount | null
   */
  async findAccountById(id: string): Promise<AccountType | null> {
    // 先尝试查询 Account
    const account = await this.findAccountByType<Account>(
      'account',
      id,
      this.accountRepository,
      ACCOUNT_RELATIONS,
    );
    if (account) {
      return account;
    }

    // 再尝试查询 OpAccount
    return this.findAccountByType<OpAccount>(
      'opAccount',
      id,
      this.opAccountRepository,
      OP_ACCOUNT_RELATIONS,
    );
  }

  /**
   * 根据账号类型查询账号
   */
  private async findAccountByType<T extends AccountType>(
    type: 'account' | 'opAccount',
    id: string,
    repository: Repository<T>,
    relations: string[],
  ): Promise<T | null> {
    const cacheKey = this.getAccountCacheKey(id, type);
    return this.cacheService.wrap(
      {
        key: cacheKey,
        unless: (r) => !r,
      },
      () =>
        repository.findOne({
          where: { id } as unknown as FindOptionsWhere<T>,
          relations,
        }),
    );
  }

  /**
   * 生成账号缓存键
   */
  private getAccountCacheKey(
    id: string,
    type: 'account' | 'opAccount',
  ): string {
    return `account:${type}:info_by_id:${id}`;
  }

  /**
   * 清除指定账号的缓存
   */
  async clearAccountCache(accountId: string): Promise<void> {
    const keys = [
      this.getAccountCacheKey(accountId, 'account'),
      this.getAccountCacheKey(accountId, 'opAccount'),
    ];
    await this.cacheService.evictMany(keys);
  }
}
