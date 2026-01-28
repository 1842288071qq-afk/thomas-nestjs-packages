import { AccountCredential } from './account-credential.entity';
import { AccountChannelBinding } from './account-channel-binding.entity';
import { AccountProfile } from './account-profile.entity';
import { Account } from './account.entity';
import { OpAccount } from './op-account.entity';
import { OpAccountCredential } from './op-account-credential.entity';
import { OpAccountProfile } from './op-account-profile.entity';
import { OpAccountChannelBinding } from './op-account-channel-binding.entity';
import { LoginAudit } from './login-audit.entity';
import { OpLoginAudit } from './op-login-audit.entity';
// 数组导出
export const AccountEntities = [
  Account,
  AccountCredential,
  AccountProfile,
  AccountChannelBinding,
  LoginAudit,
  OpAccount,
  OpAccountCredential,
  OpAccountProfile,
  OpAccountChannelBinding,
  OpLoginAudit,
];

export * from './account-credential.entity';
export * from './account-channel-binding.entity';
export * from './account-profile.entity';
export * from './account.entity';
export * from './login-audit.entity';
export * from './op-account.entity';
export * from './op-account-credential.entity';
export * from './op-account-profile.entity';
export * from './op-account-channel-binding.entity';
export * from './op-login-audit.entity';
