import { Column } from 'typeorm';
import {
  ObjectActiveStatus,
  WithId,
  WithSoftDelete,
  WithTimeTrace,
} from './extendable';

class BaseAccountRoot {}

export abstract class BaseAccount extends WithSoftDelete(
  WithTimeTrace(WithId(BaseAccountRoot)),
) {
  @Column({ length: 64 })
  username: string;

  @Column({ length: 32, nullable: true })
  phone?: string;

  @Column({ length: 16, default: ObjectActiveStatus.ACTIVE })
  status: ObjectActiveStatus;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;
}
