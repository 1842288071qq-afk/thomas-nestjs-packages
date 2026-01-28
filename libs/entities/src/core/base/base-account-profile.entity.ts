import { Column } from 'typeorm';
import { EntityWithIdAndTimeTrace } from './extendable';

export abstract class BaseAccountProfile extends EntityWithIdAndTimeTrace {
  @Column({ name: 'avatar_url', length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ length: 16, nullable: true })
  gender?: string;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: Date;

  @Column({ length: 64, nullable: true })
  province?: string;

  @Column({ length: 64, nullable: true })
  city?: string;

  @Column({ type: 'jsonb', nullable: true })
  extra?: Record<string, unknown>;
}
