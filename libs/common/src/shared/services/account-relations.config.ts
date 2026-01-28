/**
 * 账号关联关系配置
 * 管理 Account 和 OpAccount 的 ORM 关联查询路径
 * 方便统一维护和修改关联关系
 */

/**
 * Account 账号的关联查询关系
 * 加载路径：account -> identities -> (业务user)
 */
export const ACCOUNT_RELATIONS = ['profile', 'identities', 'identities.user'];

/**
 * OpAccount 操作账号的关联查询关系
 * 加载路径：opAccount -> identities -> opUser
 */
export const OP_ACCOUNT_RELATIONS = [
  'profile',
  'identities',
  'identities.opUser',
  'identities.opUser.roles',
];
