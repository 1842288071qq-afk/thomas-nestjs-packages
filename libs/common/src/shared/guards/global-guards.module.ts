import { INestApplication, Type } from '@nestjs/common';
import { JwtAuthGuard, SessionGuard } from '@qyy-code-lego/nestjs/core';
import { AccountDeserializeGuard } from './account-deserialize';
import { IdentityRequiredGuard } from './identity-required';
import { PermissionGuard } from './permission';

export enum GlobalGuardType {
  JWT_AUTH = 'jwtAuth',
  SESSION = 'session',
  ACCOUNT_DESERIALIZE = 'accountDeserialize',
  IDENTITY_REQUIRED = 'identityRequired',
  PERMISSION = 'permission',
}

export interface ConnectGlobalGuardsOptions {
  guardMap?: Partial<Record<GlobalGuardType, boolean>>;
}

type GuardToken = Type<
  | JwtAuthGuard
  | SessionGuard
  | AccountDeserializeGuard
  | IdentityRequiredGuard
  | PermissionGuard
>;

const guardOrder: Array<{
  type: GlobalGuardType;
  token: GuardToken;
}> = [
  { type: GlobalGuardType.JWT_AUTH, token: JwtAuthGuard },
  { type: GlobalGuardType.SESSION, token: SessionGuard },
  {
    type: GlobalGuardType.ACCOUNT_DESERIALIZE,
    token: AccountDeserializeGuard,
  },
  { type: GlobalGuardType.IDENTITY_REQUIRED, token: IdentityRequiredGuard },
  { type: GlobalGuardType.PERMISSION, token: PermissionGuard },
];

/**
 * 全局 Guard 注册入口
 *
 * - 默认按既定顺序注册全部 Guard
 * - 可通过 guardMap 关闭部分 Guard
 * - 顺序始终固定，不受外部传参顺序影响
 */
export class GlobalGuardsModule {
  static connect(
    app: INestApplication,
    options?: ConnectGlobalGuardsOptions,
  ): void {
    const guardMap = options?.guardMap ?? {};
    const guards = guardOrder
      .filter(({ type }) => guardMap[type] !== false)
      .map(({ token }) => app.get(token, { strict: false }));

    if (guards.length > 0) {
      app.useGlobalGuards(...guards);
    }
  }
}

export function connectGlobalGuards(
  app: INestApplication,
  options?: ConnectGlobalGuardsOptions,
): void {
  GlobalGuardsModule.connect(app, options);
}
