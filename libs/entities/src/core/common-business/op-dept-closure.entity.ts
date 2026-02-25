import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { OpDept } from './op-dept.entity';

@Entity({ name: 'op_dept_closure' })
@Index('idx_op_dept_closure_descendant', ['descendantDeptId'])
@Index('idx_op_dept_closure_ancestor_descendant', [
  'ancestorDeptId',
  'descendantDeptId',
])
export class OpDeptClosure {
  @PrimaryColumn({ name: 'ancestor_dept_id' })
  ancestorDeptId: string;

  @PrimaryColumn({ name: 'descendant_dept_id' })
  descendantDeptId: string;

  @ManyToOne(() => OpDept, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ancestor_dept_id' })
  ancestor?: OpDept;

  @ManyToOne(() => OpDept, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'descendant_dept_id' })
  descendant?: OpDept;

  @Column({ type: 'int' })
  distance: number;
}
