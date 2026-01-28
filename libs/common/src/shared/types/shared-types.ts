import { Account } from '@app/entities/core/account/account.entity';
import { OpAccount } from '@app/entities/core/account/op-account.entity';
import { Identity, HospitalRole, OpRole } from '@app/entities/auth';

declare global {
  // 扩展 ThreadLocalStore 接口
  interface ThreadLocalStore<
    T = Account | OpAccount,
    I = Identity,
    R = HospitalRole | OpRole,
  > {
    // 账号信息
    account?: T | null;
    // 当前使用的身份信息,包含业务领域的用户对象
    identity?: I | null;
    // 角色列表
    roles?: R[] | null;
    // 权限代码
    permissionCodes?: string[] | null;
  }
}
