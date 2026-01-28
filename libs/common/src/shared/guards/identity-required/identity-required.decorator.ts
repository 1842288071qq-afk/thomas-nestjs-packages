import { SetMetadata, CustomDecorator } from '@nestjs/common';

import {
  IdentityType,
  IdentityTypeNameMap,
} from '@app/entities/core/identity/constants';

export { IdentityType };

export const IDENTITY_REQUIRED_KEY = 'identity_required';

export const identityTypeNameMap = IdentityTypeNameMap;

/**
 * 身份要求装饰器
 * @param identities 要求的身份类型列表
 * @constructor
 */
export const IdentityRequired = (
  ...identities: IdentityType[]
): CustomDecorator<string> => SetMetadata(IDENTITY_REQUIRED_KEY, identities);
