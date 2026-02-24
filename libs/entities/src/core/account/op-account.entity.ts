import { BaseAccount } from '@thomas/nestjs/entities/core/base/base-account.entity';
import { Entity, OneToMany, OneToOne, DeleteDateColumn } from 'typeorm';

import { OpAccountCredential } from './op-account-credential.entity';
import { OpAccountChannelBinding } from './op-account-channel-binding.entity';
import { OpAccountProfile } from './op-account-profile.entity';
import { OpLoginAudit } from './op-login-audit.entity';
import { Identity } from '@thomas/nestjs/entities/core/identity/identity.entity';

@Entity({ name: 'op_account' })
export class OpAccount extends BaseAccount {
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt?: Date;
  @OneToOne(() => OpAccountProfile, (profile) => profile.account, {
    cascade: false,
  })
  profile: OpAccountProfile;

  @OneToMany(() => OpAccountCredential, (credential) => credential.account)
  credentials: OpAccountCredential[];

  @OneToMany(() => Identity, (identity) => identity.opAccount)
  identities: Identity[];

  @OneToMany(() => OpLoginAudit, (audit) => audit.account)
  loginAudits: OpLoginAudit[];

  @OneToMany(() => OpAccountChannelBinding, (binding) => binding.account)
  channelBindings: OpAccountChannelBinding[];
}
