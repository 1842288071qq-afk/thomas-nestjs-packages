import { BizCode } from '../../BizCode';

export const SESSION_BIZ_CODE = {
  TIMEOUT: BizCode.SESSION_TIMEOUT, // 会话超时
  INVALID: BizCode.SESSION_KICK_OUT, // 会话失效/被踢出
};

export const SESSION_BASE_PREFIX = 'session';

export const getSessionDataKey = (
  appName: string,
  system: string,
  accountId: string | number,
  jti: string,
) => `${SESSION_BASE_PREFIX}:${appName}:${system}:data:${accountId}:${jti}`;

export const getSessionLookupKey = (
  appName: string,
  system: string,
  accountId: string | number,
) => `${SESSION_BASE_PREFIX}:${appName}:${system}:lookup:${accountId}`;

export const getSessionLockKey = (
  appName: string,
  system: string,
  accountId: string | number,
  jti: string,
) =>
  `${SESSION_BASE_PREFIX}:${appName}:${system}:active_lock:${accountId}:${jti}`;
