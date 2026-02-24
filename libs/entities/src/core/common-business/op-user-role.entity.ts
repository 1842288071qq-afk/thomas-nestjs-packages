import {
  WithId,
  WithTimeTrace,
} from '@thomas/nestjs/entities/core/base/extendable';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { OpUser } from './op-user.entity';
import { Identity } from '../identity/identity.entity';
import { OpRole } from './op-role.entity';

class OpUserRoleRoot {}

@Entity({ name: 'op_user_role' })
@Index('idx_op_user_role_role', ['roleId'])
@Index('uq_op_user_role', ['opUserId', 'roleId'], {
  unique: true,
})
export class OpUserRole extends WithTimeTrace(WithId(OpUserRoleRoot)) {
  @Column({ name: 'op_user_id' })
  opUserId: string;

  @Column({ name: 'role_id' })
  roleId: string;

  @Column({ name: 'assigned_admin_id', nullable: true })
  assignedAdminId?: string;

  @CreateDateColumn({
    name: 'assigned_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  assignedAt: Date;

  @ManyToOne(() => OpUser, (user) => user.roles, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'op_user_id' })
  opUser?: OpUser;

  @ManyToOne(() => OpRole, (role) => role.userBindings, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'role_id' })
  role?: OpRole;

  @ManyToOne(() => Identity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'assigned_admin_id' })
  assignedBy?: Identity;
}
