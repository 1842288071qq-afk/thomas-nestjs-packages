import { BaseAccountCredential } from '@thomas/nestjs/entities/core/base/base-account-credential.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { Account } from './account.entity';

@Entity({ name: 'account_credential' })
@Index('idx_account_credential_account', ['accountId'])
@Index(
  'uq_account_credential_account_type_identifier',
  ['accountId', 'type', 'identifier'],
  { unique: true },
)
export class AccountCredential extends BaseAccountCredential {
  @Column({ name: 'account_id' })
  accountId: string;

  @ManyToOne(() => Account, (account) => account.credentials, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
