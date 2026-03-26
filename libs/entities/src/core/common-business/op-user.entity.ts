import {
  ObjectActiveStatus,
  WithSoftDelete,
  WithAuditor,
  WithTimeTrace,
  WithId,
} from '@thomas/nestjs/entities/core/base/extendable';
import {
  Column,
  Entity,
  Index,
  // Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';

import { Identity } from '../identity/identity.entity';
import { OpAccount } from '../account/op-account.entity';
import { OpUserRole } from './op-user-role.entity';
import { OpDept } from './op-dept.entity';

class OpUserRoot {}

@Entity({ name: 'op_user' })
@Index('uq_op_user_identity', ['identityId'], { unique: true })
export class OpUser extends WithSoftDelete(
  WithAuditor(WithTimeTrace(WithId(OpUserRoot))),
) {
  @Column({ name: 'account_id' })
  accountId: string;

  @Column({ name: 'identity_id' })
  identityId: string;

  @Column({ name: 'is_super', type: 'boolean', default: false })
  isSuper: boolean;

  @Column({ length: 64, nullable: true })
  name: string;

  @Column({ length: 32, nullable: true })
  phone?: string;

  @Column({ name: 'avatar_url', length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ length: 16, type: 'varchar', default: ObjectActiveStatus.ACTIVE })
  status: ObjectActiveStatus;

  @Column({ name: 'dept_id', nullable: true })
  deptId?: string | null;

  @OneToOne(() => Identity, (identity) => identity.opUser, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'identity_id' })
  identity: Identity;

  @ManyToOne(() => OpAccount, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'account_id' })
  account: OpAccount;

  @ManyToOne(() => OpDept, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'dept_id' })
  dept?: OpDept;

  @OneToMany(() => OpUserRole, (userRole) => userRole.opUser)
  roles: OpUserRole[];

  @ManyToOne(() => Identity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'created_by' })
  creator?: Identity;

  @ManyToOne(() => Identity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'updated_by' })
  updater?: Identity;
}
