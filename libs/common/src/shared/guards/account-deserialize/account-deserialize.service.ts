import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { ThreadLocal } from '@qyy-code-lego/nestjs/core/nest/als/thread-local';
import { JwtPayload } from '@qyy-code-lego/nestjs/core/nest/jwt-auth';
import { FindAccountService } from '../../services/find-account.service';
import '../../types/shared-types';

@Injectable()
export class AccountDeserializeService {
  private readonly logger = new Logger(AccountDeserializeService.name);

  constructor(
    private readonly threadLocal: ThreadLocal,
    private readonly findAccountService: FindAccountService,
  ) {}

  /**
   * 反序列化账号信息并挂载到 ALS
   */
  async deserialize(req: Request): Promise<void> {
    const user = req.user as JwtPayload | undefined;
    const accountId = user?.accountId;

    if (!accountId) {
      this.threadLocal.set('account', null);
      return;
    }

    try {
      const account = await this.findAccountService.findAccountById(accountId);
      this.threadLocal.set('account', account || null);
    } catch (error) {
      this.logger.error(`Failed to deserialize account ${accountId}`, error);
      this.threadLocal.set('account', null);
    }
  }
}
