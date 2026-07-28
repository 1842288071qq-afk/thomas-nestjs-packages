import { BaseAccountCredential } from '@qyy-code-lego/nestjs/entities/core/base/base-account-credential.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { OpAccount } from './op-account.entity';

@Entity({ name: 'op_account_credential' })
@Index('idx_op_account_credential_account', ['opAccountId'])
@Index(
  'uq_op_account_credential_account_type_identifier',
  ['opAccountId', 'type', 'identifier'],
  { unique: true },
)
export class OpAccountCredential extends BaseAccountCredential {
  @Column({ name: 'op_account_id' })
  opAccountId: string;

  @ManyToOne(() => OpAccount, (account) => account.credentials, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'op_account_id' })
  account: OpAccount;
}
