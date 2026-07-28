import {
  ObjectActiveStatus,
  WithSoftDelete,
  WithAuditor,
  WithTimeTrace,
  WithId,
} from '@qyy-code-lego/nestjs/entities/core/base/extendable';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';

import { Identity } from '../identity/identity.entity';
import { Account } from '../account/account.entity';
class UserRoot {}

@Entity({ name: 'user' })
@Index('uq_user_identity', ['identityId'], { unique: true })
export class User extends WithSoftDelete(
  WithAuditor(WithTimeTrace(WithId(UserRoot))),
) {
  @Column({ name: 'account_id', nullable: true })
  accountId?: string;

  @Column({ name: 'identity_id' })
  identityId: string;

  @Column({ length: 64, nullable: true })
  name: string;

  @Column({ length: 32, nullable: true })
  phone?: string;

  @Column({ name: 'avatar_url', length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ length: 16, type: 'varchar', default: ObjectActiveStatus.ACTIVE })
  status: ObjectActiveStatus;

  @OneToOne(() => Identity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'identity_id' })
  identity: Identity;

  @ManyToOne(() => Account, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'account_id' })
  account?: Account;

  @ManyToOne(() => Identity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'created_by' })
  creator?: Identity;

  @ManyToOne(() => Identity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'updated_by' })
  updater?: Identity;
}
