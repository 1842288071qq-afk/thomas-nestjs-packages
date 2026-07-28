import { BaseLoginAudit } from '@qyy-code-lego/nestjs/entities/core/base/base-login-audit.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { Account } from './account.entity';
import { Identity } from '../identity';

@Entity({ name: 'login_audit' })
export class LoginAudit extends BaseLoginAudit {
  @Column({ name: 'account_id' })
  declare accountId: string;

  @Column({ name: 'identity_id', nullable: true })
  declare identityId?: string;

  @ManyToOne(() => Account, (account) => account.loginAudits, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => Identity, (identity) => identity.loginAudits)
  @JoinColumn({ name: 'identity_id' })
  identity: Identity;
}
