import { AccountSource } from '@thomas/nestjs/entities';

export const ACCOUNT_AVATAR_UPDATED_EVENT = 'account.avatar.updated';

export interface AccountAvatarUpdatedEvent {
  accountId: string;
  accountSource: AccountSource;
  avatarUrl: string;
}
