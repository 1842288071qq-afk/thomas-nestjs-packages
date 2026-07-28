import { WithId } from '@qyy-code-lego/nestjs/entities/core/base/extendable';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { OpRole } from './op-role.entity';
import { OpPermission } from './op-permission.entity';

class OpRolePermissionRoot {}

@Entity({ name: 'op_role_permission' })
@Index('idx_op_role_permission_code', ['permissionCode'])
@Index('uq_op_role_permission', ['roleId', 'permissionCode'], {
  unique: true,
})
export class OpRolePermission extends WithId(OpRolePermissionRoot) {
  @Column({ name: 'role_id' })
  roleId: string;

  @Column({ name: 'permission_code', length: 64 })
  permissionCode: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @ManyToOne(() => OpRole, (role) => role.permissions, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'role_id' })
  role?: OpRole;

  @ManyToOne(() => OpPermission, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'permission_code', referencedColumnName: 'code' })
  permission?: OpPermission;
}
