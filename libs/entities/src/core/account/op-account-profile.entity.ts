import { BaseAccountProfile } from '@thomas/nestjs/entities/core/base/base-account-profile.entity';
import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';

import { OpAccount } from './op-account.entity';

@Entity({ name: 'op_account_profile' })
@Index('uq_op_account_profile_account', ['opAccountId'], { unique: true })
export class OpAccountProfile extends BaseAccountProfile {
  @Column({ name: 'op_account_id' })
  opAccountId: string;

  @OneToOne(() => OpAccount, (account) => account.profile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'op_account_id' })
  account: OpAccount;
}
