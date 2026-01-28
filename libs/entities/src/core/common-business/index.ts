import { OpDept } from './op-dept.entity';
import { OpDeptClosure } from './op-dept-closure.entity';
import { OpPermission } from './op-permission.entity';
import { OpRole } from './op-role.entity';
import { OpRolePermission } from './op-role-permission.entity';
import { OpUser } from './op-user.entity';
import { OpUserRole } from './op-user-role.entity';
import { User } from './user.entity';

export const CommonBusinessEntities = [
  OpDept,
  OpDeptClosure,
  OpPermission,
  OpRole,
  OpRolePermission,
  OpUser,
  OpUserRole,
  User,
];

export * from './op-dept.entity';
export * from './op-dept-closure.entity';
export * from './op-permission.entity';
export * from './op-role.entity';
export * from './op-role-permission.entity';
export * from './op-user.entity';
export * from './op-user-role.entity';
export * from './user.entity';
