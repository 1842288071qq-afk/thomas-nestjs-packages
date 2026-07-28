import { BasePermission } from '@qyy-code-lego/nestjs/entities/core/base/base-permission.entity';
import { Entity } from 'typeorm';

@Entity({ name: 'op_permission' })
export class OpPermission extends BasePermission {}
