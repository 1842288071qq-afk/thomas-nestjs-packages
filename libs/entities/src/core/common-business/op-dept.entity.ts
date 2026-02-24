import {
  WithAuditor,
  WithTimeTrace,
  WithId,
} from '@thomas/nestjs/entities/core/base/extendable';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { Identity } from '../identity/identity.entity';

class OpDeptRoot {}

@Entity({ name: 'op_dept' })
@Index('idx_op_dept_parent', ['parentDeptId'])
@Index('uq_op_dept_id_path', ['idPath'], { unique: true })
export class OpDept extends WithAuditor(WithTimeTrace(WithId(OpDeptRoot))) {
  @Column({ name: 'parent_dept_id', nullable: true })
  parentDeptId?: string;

  @Column({ length: 128 })
  name: string;

  @Column({ type: 'int', default: 0 })
  depth: number;

  @Column({ name: 'id_path', length: 1024, comment: '逗号分隔的 ID 路径' })
  idPath: string;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @ManyToOne(() => OpDept, (dept) => dept.children, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'parent_dept_id' })
  parent?: OpDept;

  @OneToMany(() => OpDept, (dept) => dept.parent)
  children: OpDept[];

  @ManyToOne(() => Identity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'created_by' })
  creator?: Identity;

  @ManyToOne(() => Identity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'updated_by' })
  updater?: Identity;
}
