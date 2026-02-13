export enum BizCode {
  /** 基础错误 (400) */
  BAD_REQUEST = 400,

  /** 基础权限 (401) */
  UNAUTHORIZED = 401,

  /** 会话维持相关 (属于 Core 提供的 Session 能力) */
  SESSION_TIMEOUT = 40111, // 会话超时
  SESSION_KICK_OUT = 40112, // 会话失效/被踢出

  /** 基础拒绝 (403) */
  FORBIDDEN = 403,

  /** 资源相关 (404) */
  NOT_FOUND = 404,

  /** 冲突相关 (409) */
  CONFLICT = 409,

  /** 服务错误 (500) */
  INTERNAL_ERROR = 500,
}
