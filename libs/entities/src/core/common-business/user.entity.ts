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
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';

import { Identity } from '../identity/identity.entity';
class UserRoot {}

@Entity({ name: 'user' })
@Index('uq_user_identity', ['identityId'], { unique: true })
export class User extends WithSoftDelete(
  WithAuditor(WithTimeTrace(WithId(UserRoot))),
) {
  @Column({ name: 'identity_id' })
  identityId: string;

  @Column({ length: 64, nullable: true })
  name: string;

  @Column({ length: 32, nullable: true })
  phone?: string;

  @Column({ length: 16, default: 'active' })
  status: string;

  @OneToOne(() => Identity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'identity_id' })
  identity: Identity;

  @ManyToOne(() => Identity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'created_by' })
  creator?: Identity;

  @ManyToOne(() => Identity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'updated_by' })
  updater?: Identity;
}
