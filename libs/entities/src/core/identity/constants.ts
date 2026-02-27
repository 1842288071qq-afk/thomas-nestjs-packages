/**
 * 账号来源映射
 * 目前分为普通账号系统和运营平台账号系统
 */
export enum AccountSource {
  ACCOUNT = 'account',
  OP_ACCOUNT = 'op_account',
}

/**
 * 身份类型枚举
 */
export enum IdentityType {
  User = 'user',
  OP_USER = 'op_user',
}

export const IdentityTypeNameMap: Record<IdentityType, string> = {
  [IdentityType.User]: '普通用户',
  [IdentityType.OP_USER]: '运营平台用户',
};
