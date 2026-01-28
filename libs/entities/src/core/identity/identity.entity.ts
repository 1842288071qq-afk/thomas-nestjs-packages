import { JoinColumn, ManyToOne } from 'typeorm';
import { Account } from '../account';
import { BaseIdentity } from '../base/base-identity.entity';
import { OpAccount } from '../account/op-account.entity';

export class Identity extends BaseIdentity {
  // --- 账号关联 ---

  @ManyToOne(() => Account, (account) => account.identities, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'account_id' })
  account?: Account;

  @ManyToOne(() => OpAccount, (account) => account.identities, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'account_id' })
  opAccount?: OpAccount;
}
