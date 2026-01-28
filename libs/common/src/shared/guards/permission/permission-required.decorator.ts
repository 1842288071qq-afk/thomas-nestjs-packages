import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { PermissionRequirement } from './permission.types';

export const PERMISSION_REQUIRED_KEY = 'permission_required';

/**
 * 权限要求装饰器
 * 支持:
 * 1. 单个权限字符串: 'user.create'
 * 2. 权限字符串数组(AND关系): ['user.create', 'user.delete']
 * 3. 复杂逻辑数组(OR关系): [['user.view'], ['order.view']]
 * 4. 自定义函数: (list) => list.includes('admin')
 */
export const PermissionRequired = (
  requirement: PermissionRequirement,
): CustomDecorator<string> => SetMetadata(PERMISSION_REQUIRED_KEY, requirement);
