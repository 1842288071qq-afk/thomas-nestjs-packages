import { BasePermission } from '@app/entities/base/base-permission.entity';
import { Entity } from 'typeorm';

@Entity({ name: 'op_permission' })
export class OpPermission extends BasePermission {}
