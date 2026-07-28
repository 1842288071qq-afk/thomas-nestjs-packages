import { BaseAccount } from '@qyy-code-lego/nestjs/entities/core/base/base-account.entity';
import { Entity, OneToMany, OneToOne } from 'typeorm';

import { AccountCredential } from './account-credential.entity';
import { AccountChannelBinding } from './account-channel-binding.entity';
import { AccountProfile } from './account-profile.entity';
import { LoginAudit } from './login-audit.entity';
import { Identity } from '@qyy-code-lego/nestjs/entities/core/identity/identity.entity';

@Entity({ name: 'account' })
export class Account extends BaseAccount {
  @OneToOne(() => AccountProfile, (profile) => profile.account, {
    cascade: false,
  })
  profile: AccountProfile;

  @OneToMany(() => AccountCredential, (credential) => credential.account)
  credentials: AccountCredential[];

  @OneToMany(() => Identity, (identity) => identity.account)
  identities: Identity[];

  @OneToMany(() => LoginAudit, (audit) => audit.account)
  loginAudits: LoginAudit[];

  @OneToMany(() => AccountChannelBinding, (binding) => binding.account)
  channelBindings: AccountChannelBinding[];
}
