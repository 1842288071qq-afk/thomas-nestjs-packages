import { Column, Entity, Index } from 'typeorm';
import { EntityWithIdAndTimeTraceAndSoftDelete } from './extendable';
import { AccountSource, IdentityType } from '../identity/constants';

@Entity({ name: 'identity' })
@Index('idx_identity_account', ['accountId', 'accountSource'])
@Index('idx_identity_type', ['identityType'])
export class BaseIdentity extends EntityWithIdAndTimeTraceAndSoftDelete {
  @Column({
    name: 'account_source',
    type: 'varchar',
    length: 32,
    default: AccountSource.ACCOUNT,
  })
  accountSource: AccountSource;

  @Column({
    name: 'identity_type',
    type: 'varchar',
    length: 32,
  })
  identityType: IdentityType;

  @Column({ name: 'account_id' })
  accountId: string;

  @Column({ length: 16, default: 'active' })
  status: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt?: Date;
  // 可根据 具体业务用户关系扩展orm关系映射
}
