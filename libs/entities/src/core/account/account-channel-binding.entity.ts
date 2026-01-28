import { BaseAccountChannelBinding } from '@app/entities/core/base/base-account-channel-binding.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { Account } from './account.entity';

@Entity({ name: 'account_channel_binding' })
@Index('idx_account_channel_binding_account', ['accountId'])
export class AccountChannelBinding extends BaseAccountChannelBinding {
  @Column({ name: 'account_id' })
  accountId: string;

  @ManyToOne(() => Account, (account) => account.channelBindings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
