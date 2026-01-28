// Base entities
export * from './base/index';
export { BasePermission } from './base/base-permission.entity';

// Account entities
export * from './account/index';

// Identity entities
export * from './identity/index';

// Common business entities
export * from './common-business/index';

// System entities
export * from './sys/index';

// Aggregate all entities for TypeORM configuration
import { AccountEntities } from './account/index';
import { IdentityEntities } from './identity/index';
import { CommonBusinessEntities } from './common-business/index';
import { SysEntities } from './sys/index';

export const CoreEntities = [
  ...AccountEntities,
  ...IdentityEntities,
  ...CommonBusinessEntities,
  ...SysEntities,
];
