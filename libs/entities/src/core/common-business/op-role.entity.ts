import { EntityWithIdAndTimeTrace } from '@app/entities/core/base/extendable';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { Identity } from '../base/base-identity.entity';
import { OpRolePermission } from './op-role-permission.entity';
import { OpUserRole } from './op-user-role.entity';

@Entity({ name: 'op_role' })
@Index('uq_op_role_name', ['name'], { unique: true })
export class OpRole extends EntityWithIdAndTimeTrace {
  @Column({ name: 'code', length: 64 })
  code: string;

  @Column({ length: 64 })
  name: string;

  @Column({ name: 'created_admin_id', nullable: true })
  createdAdminId: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 16, default: 'enabled' })
  enable: string;

  @ManyToOne(() => Identity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'created_admin_id' })
  creator?: Identity;

  @OneToMany(() => OpRolePermission, (rolePermission) => rolePermission.role)
  permissions: OpRolePermission[];

  @OneToMany(() => OpUserRole, (userRole) => userRole.role)
  userBindings: OpUserRole[];

  userCount?: number;
}
