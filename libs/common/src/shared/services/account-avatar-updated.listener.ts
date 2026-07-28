import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AccountSource,
  Identity,
  IdentityType,
  OpUser,
  User,
} from '@qyy-code-lego/nestjs/entities';
import { In, Repository } from 'typeorm';
import {
  ACCOUNT_AVATAR_UPDATED_EVENT,
  AccountAvatarUpdatedEvent,
} from './account-avatar.events';

@Injectable()
export class AccountAvatarUpdatedListener {
  constructor(
    @InjectRepository(Identity)
    private readonly identityRepository: Repository<Identity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(OpUser)
    private readonly opUserRepository: Repository<OpUser>,
  ) {}

  @OnEvent(ACCOUNT_AVATAR_UPDATED_EVENT)
  async handleAccountAvatarUpdated(event: unknown): Promise<void> {
    const payload = event as AccountAvatarUpdatedEvent;
    const handleMap: Record<AccountSource, () => Promise<void>> = {
      [AccountSource.ACCOUNT]: async () => {
        const identities = await this.identityRepository.find({
          where: {
            accountId: payload.accountId,
            accountSource: AccountSource.ACCOUNT,
            identityType: IdentityType.User,
          },
          select: ['id'],
        });
        const identityIds = identities.map((item) => item.id);
        if (identityIds.length === 0) {
          return;
        }

        await this.userRepository.update(
          { identityId: In(identityIds) },
          { avatarUrl: payload.avatarUrl },
        );
      },
      [AccountSource.OP_ACCOUNT]: async () => {
        const identities = await this.identityRepository.find({
          where: {
            accountId: payload.accountId,
            accountSource: AccountSource.OP_ACCOUNT,
            identityType: IdentityType.OP_USER,
          },
          select: ['id'],
        });
        const identityIds = identities.map((item) => item.id);
        if (identityIds.length === 0) {
          return;
        }

        await this.opUserRepository.update(
          { identityId: In(identityIds) },
          { avatarUrl: payload.avatarUrl },
        );
      },
    };

    await handleMap[payload.accountSource]();
  }
}
