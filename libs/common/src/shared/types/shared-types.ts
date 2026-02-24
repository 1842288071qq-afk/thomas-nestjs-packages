import { Identity, OpRole } from '@thomas/nestjs/entities';
import { Account } from '@thomas/nestjs/entities/core/account/account.entity';
import { OpAccount } from '@thomas/nestjs/entities/core/account/op-account.entity';

declare global {
  // 扩展 ThreadLocalStore 接口
  interface ThreadLocalStore<
    // 账号类型，默认为 Account 或 OpAccount
    T = Account | OpAccount,
    // 身份类型，统一为Identity
    I = Identity,
    // 业务角色，默认为 OpRole (只有运营平台有角色概念)
    R = OpRole,
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
