import { Column, Index } from 'typeorm';
import { WithId, WithTimeTrace } from './extendable';

class BaseAccountRoot {}

@Index('uq_account_username', ['username'], { unique: true })
@Index('uq_account_phone', ['phone'], { unique: true })
export abstract class BaseAccount extends WithTimeTrace(
  WithId(BaseAccountRoot),
) {
  @Column({ length: 64 })
  username: string;

  @Column({ length: 32, nullable: true })
  phone?: string;

  @Column({ length: 64, nullable: true })
  nickname?: string;

  @Column({ name: 'real_name', length: 64, nullable: true })
  realName?: string;

  @Column({ length: 16, default: 'active' })
  status: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;
}
