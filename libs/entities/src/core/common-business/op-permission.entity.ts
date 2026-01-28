import { BasePermission } from '@app/entities/core/base/base-permission.entity';
import { Entity } from 'typeorm';

@Entity({ name: 'op_permission' })
export class OpPermission extends BasePermission {}
