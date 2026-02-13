import { BizCode } from '../../BizCode';

export const SESSION_BIZ_CODE = {
  TIMEOUT: BizCode.SESSION_TIMEOUT, // 会话超时
  INVALID: BizCode.SESSION_KICK_OUT, // 会话失效/被踢出
};

export const SESSION_BASE_PREFIX = 'session';

export const getSessionDataKey = (
  groupName: string,
  accountId: string | number,
  jti: string,
) => `${SESSION_BASE_PREFIX}:${groupName}:data:${accountId}:${jti}`;

export const getSessionLookupKey = (
  groupName: string,
  accountId: string | number,
  system: string,
) => `${SESSION_BASE_PREFIX}:${groupName}:lookup:${accountId}:${system}`;

export const getSessionLockKey = (
  groupName: string,
  accountId: string | number,
  jti: string,
) => `${SESSION_BASE_PREFIX}:${groupName}:active_lock:${accountId}:${jti}`;
