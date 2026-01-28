import { Column, CreateDateColumn, Index } from 'typeorm';
import { EntityWithId } from './extendable';

@Index('idx_audit_success', ['success'])
@Index('idx_audit_account_created', ['accountId', 'createdAt'])
@Index('idx_audit_identity_created', ['identityId', 'createdAt'])
export abstract class BaseLoginAudit extends EntityWithId {
  @Column({ name: 'account_id' })
  accountId: string;

  @Column({ name: 'identity_id', nullable: true })
  identityId?: string;
  @Column({ length: 32, nullable: true })
  channel?: string;

  @Column({ length: 45, nullable: true })
  ip?: string;

  @Column({ name: 'user_agent', length: 255, nullable: true })
  userAgent?: string;

  @Column({ type: 'boolean' })
  success: boolean;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;
}
