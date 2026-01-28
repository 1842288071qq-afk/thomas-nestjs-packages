import { Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { Account, LoginAudit } from '../account';
import { BaseIdentity } from '../base/base-identity.entity';
import { OpAccount } from '../account/op-account.entity';
import { User } from '../common-business/user.entity';
import { OpUser } from '../common-business/op-user.entity';

@Entity({ name: 'identity' })
export class Identity extends BaseIdentity {
  // -- login-audit 关联 --
  @OneToMany(() => LoginAudit, (audit) => audit.identity)
  loginAudits: LoginAudit[];
  // --- 账号关联 ---

  @ManyToOne(() => Account, (account) => account.identities, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'account_id' })
  account?: Account;

  @ManyToOne(() => OpAccount, (account) => account.identities, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'account_id' })
  opAccount?: OpAccount;

  // --- 业务用户关联---

  @OneToOne(() => User, (user) => user.identity, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  user?: User;

  @OneToOne(() => OpUser, (opUser) => opUser.identity, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  opUser?: OpUser;
}
