import { AccountCredential } from './account-credential.entity';
import { AccountChannelBinding } from './account-channel-binding.entity';
import { AccountProfile } from './account-profile.entity';
import { Account } from './account.entity';
// 数组导出
export const AccountEntities = [
  Account,
  AccountCredential,
  AccountProfile,
  AccountChannelBinding,
];

export * from './account-credential.entity';
export * from './account-channel-binding.entity';
export * from './account-profile.entity';
export * from './account.entity';
