import { snowflakeIdGenerator } from '@qyy-code-lego/nestjs/common/utils/id';
import {
  PrimaryColumn,
  BeforeInsert,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

/**
 * 通用的构造函数类型，用于 Mixin 模式
 */
export type Constructor<T = object> = new (...args: any[]) => T;

// ==========================================
// 1. 定义原子 Mixins (公共能力)
// ==========================================

/**
 * Mixin: 增加自动雪花 ID 支持
 * 包含 id 字段和 BeforeInsert 自动生成逻辑
 */
export function WithId<TBase extends Constructor>(Base: TBase) {
  abstract class Trait extends Base {
    @PrimaryColumn()
    id: string;

    @BeforeInsert()
    autoGenId() {
      if (!this.id) {
        this.id = snowflakeIdGenerator.nextId().toString();
      }
    }
  }
  return Trait;
}

/**
 * Mixin: 增加创建/更新时间追踪
 * 包含 created_at 和 updated_at 字段
 */
export function WithTimeTrace<TBase extends Constructor>(Base: TBase) {
  abstract class Trait extends Base {
    @CreateDateColumn({
      name: 'created_at',
      type: 'timestamptz',
    })
    createdAt: Date;

    @UpdateDateColumn({
      name: 'updated_at',
      type: 'timestamptz',
    })
    updatedAt: Date;
  }
  return Trait;
}

/**
 * Mixin: 增加创建/更新人追踪
 * 包含 created_by 和 updated_by 字段
 */
export function WithAuditor<TBase extends Constructor>(Base: TBase) {
  abstract class Trait extends Base {
    @Column({ name: 'created_by', nullable: true })
    createdBy?: string;

    @Column({ name: 'updated_by', nullable: true })
    updatedBy?: string;

    // // 后台
    // @Column({ name: 'created_by_op', nullable: true })
    // createdByOp?: string;

    // @Column({ name: 'updated_by_op', nullable: true })
    // updatedByOp?: string;
  }
  return Trait;
}

/**
 * Mixin: 增加逻辑删除支持
 * 包含 deleted_at 字段
 */
export function WithSoftDelete<TBase extends Constructor>(Base: TBase) {
  abstract class Trait extends Base {
    @DeleteDateColumn({
      name: 'deleted_at',
      type: 'timestamptz',
      nullable: true,
    })
    deletedAt?: Date | null;
  }
  return Trait;
}

export enum ObjectActiveStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

/**
 * Mixin: 增加状态管理支持
 * 包含 status 字段，统一状态值为 'active' | 'disabled' 等
 */
export function WithStatus<TBase extends Constructor>(Base: TBase) {
  abstract class Trait extends Base {
    @Column({
      type: 'varchar',
      length: 16,
      default: ObjectActiveStatus.ACTIVE,
    })
    status: ObjectActiveStatus;
  }
  return Trait;
}

/**
 * 数据范围策略枚举
 */
export enum ScopeStrategy {
  ALL = 'ALL', // 全局可见,
  DEPT_AND_CHILDREN = 'DEPT_AND_CHILDREN', // 部门以及下属部门,
  SELF = 'SELF', // 仅个人看到
  DEPT_ONLY = 'DEPT_ONLY', // 仅本部门看到
}

/**
 * Mixin: 增加数据范围控制支持
 * 包含 scope_strategy、scope_dept_id、scope_creator_id 字段
 */
export function WithScopeStrategy<TBase extends Constructor>(Base: TBase) {
  abstract class Trait extends Base {
    // (scope_strategy, scope_dept_id)（联合索引）
    @Column({
      name: 'scope_strategy',
      length: 32,
      type: 'varchar',
      default: ScopeStrategy.ALL,
    })
    scopeStrategy: ScopeStrategy;

    // (scope_strategy, scope_dept_id)（联合索引）
    @Column({
      name: 'scope_dept_id',
      type: 'bigint',
      nullable: true,
    })
    scopeDeptId?: string;

    // scope_creator_id（单列索引）
    @Column({
      name: 'scope_creator_id',
      type: 'bigint',
      nullable: true,
    })
    scopeCreatorId?: string;
  }
  return Trait;
}
