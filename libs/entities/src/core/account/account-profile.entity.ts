import { BaseAccountProfile } from '@thomas/nestjs/entities/core/base/base-account-profile.entity';
import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';

import { Account } from './account.entity';

@Entity({ name: 'account_profile' })
@Index('uq_account_profile_account', ['accountId'], { unique: true })
export class AccountProfile extends BaseAccountProfile {
  @Column({ name: 'account_id' })
  accountId: string;

  @OneToOne(() => Account, (account) => account.profile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
