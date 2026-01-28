/**
 * JWT 标准载荷（payload）
 * ⚠️ 不包含敏感信息
 */
export interface JwtPayload {
  /** token 唯一 ID（用于会话、吊销、追踪） */
  jti: string;

  /** 账号 ID */
  accountId: string;

  /** 身份 ID 列表（如：管理员 / 医生 / 用户） */
  identityIds: string[];

  /** 客户端类型（web / ios / android / miniapp / api） */
  client: string;

  /** 系统名称（区分多系统颁发） */
  system: string;

  /** JWT 签发时间（秒） */
  iat: number;

  /** JWT 过期时间（秒） */
  exp?: number;
}
