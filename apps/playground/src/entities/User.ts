import { EntityWithId } from '@app/entities/core/base/extendable';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'sys_user' })
export class User extends EntityWithId {
  @Column()
  name: string;
  @Column()
  age: number;

  @Column({ type: 'jsonb', nullable: true })
  metaDataJson: IMetaData;

  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to(value: string[]): string {
        return value?.join(',') ?? null;
      },
      from(value: string): string[] {
        return value?.split(',') ?? [];
      },
    },
  })
  metaDataText: string[];
}

export interface IMetaData {
  a: string;
  b: number;
  c: boolean;
}
