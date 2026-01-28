import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * 权限基类
 * 权限使用 code (VARCHAR) 作为主键，而不是自增 ID
 */
@Entity()
export class BasePermission {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 16 })
  type: string;

  @Column({ type: 'varchar', length: 128, name: 'display_name' })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: string;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
