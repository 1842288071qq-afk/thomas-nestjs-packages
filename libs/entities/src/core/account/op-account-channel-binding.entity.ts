import { BaseAccountChannelBinding } from '@app/entities/core/base/base-account-channel-binding.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { OpAccount } from './op-account.entity';

@Entity({ name: 'op_account_channel_binding' })
@Index('idx_op_account_channel_binding_account', ['accountId'])
export class OpAccountChannelBinding extends BaseAccountChannelBinding {
  @Column({ name: 'op_account_id' })
  accountId: string;

  @ManyToOne(() => OpAccount, (account) => account.channelBindings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'op_account_id' })
  account: OpAccount;
}
