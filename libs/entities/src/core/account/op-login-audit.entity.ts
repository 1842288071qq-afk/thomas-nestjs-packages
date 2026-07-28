import { BaseLoginAudit } from '@qyy-code-lego/nestjs/entities/core/base/base-login-audit.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { OpAccount } from './op-account.entity';
import { Identity } from '../identity';

@Entity({ name: 'op_login_audit' })
export class OpLoginAudit extends BaseLoginAudit {
  @Column({ name: 'op_account_id' })
  declare accountId: string;

  @Column({ name: 'identity_id', nullable: true })
  declare identityId?: string;

  @ManyToOne(() => OpAccount, (account) => account.loginAudits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'op_account_id' })
  account: OpAccount;

  @ManyToOne(() => Identity, (identity) => identity.loginAudits)
  @JoinColumn({ name: 'identity_id' })
  identity: Identity;
}
