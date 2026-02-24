import {
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
import { OpUserRole } from './op-user-role.entity';
import { OpDept } from './op-dept.entity';

class OpUserRoot {}

@Entity({ name: 'op_user' })
@Index('uq_op_user_identity', ['identityId'], { unique: true })
export class OpUser extends WithSoftDelete(
  WithAuditor(WithTimeTrace(WithId(OpUserRoot))),
) {
  @Column({ name: 'identity_id' })
  identityId: string;

  @Column({ name: 'is_super', type: 'boolean', default: false })
  isSuper: boolean;

  @Column({ length: 64, nullable: true })
  name: string;

  @Column({ length: 32, nullable: true })
  phone?: string;

  @Column({ length: 16, default: 'active' })
  status: string;

  @Column({ name: 'dept_id', nullable: true })
  deptId?: string | null;

  @OneToOne(() => Identity, (identity) => identity.opUser, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'identity_id' })
  identity: Identity;

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
