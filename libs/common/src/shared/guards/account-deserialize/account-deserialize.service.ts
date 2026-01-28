import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { ThreadLocal } from '@app/core/nest/als/thread-local';
import { JwtPayload } from '@app/core/nest/jwt-auth';
import { SharedService } from '../../shared.service';
import '../../types/shared-types';

@Injectable()
export class AccountDeserializeService {
  private readonly logger = new Logger(AccountDeserializeService.name);

  constructor(
    private readonly threadLocal: ThreadLocal,
    private readonly sharedService: SharedService,
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
      const account = await this.sharedService.findAccountById(accountId);
      this.threadLocal.set('account', account || null);
    } catch (error) {
      this.logger.error(`Failed to deserialize account ${accountId}`, error);
      this.threadLocal.set('account', null);
    }
  }
}
