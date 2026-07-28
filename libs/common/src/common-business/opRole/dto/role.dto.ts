import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { EnsureNotBlank } from '@qyy-code-lego/nestjs/core/nest/composition/ensure-not-blank.decorator';
import { OpAccount, OpUser } from '@qyy-code-lego/nestjs/entities';
import {
  ICreateRoleParams,
  IRoleQueryParams,
  IUpdateRoleParams,
} from '../../../shared/services/op-role-shared.service';

export class CreateRoleDTO implements ICreateRoleParams {
  @EnsureNotBlank({ message: '角色代码不能为空' })
  @MaxLength(64, { message: '角色代码长度不能超过64个字符' })
  code: string;

  @EnsureNotBlank({ message: '角色名称不能为空' })
  @MaxLength(64, { message: '角色名称长度不能超过64个字符' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  enable?: string;
}

export class UpdateRoleDTO implements IUpdateRoleParams {
  @IsOptional()
  @EnsureNotBlank()
  @MaxLength(64, { message: '角色名称长度不能超过64个字符' })
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  enable?: string;
}

export class RoleQueryDTO implements IRoleQueryParams {
  @IsOptional()
  @EnsureNotBlank()
  name?: string;

  @IsOptional()
  @IsString()
  enable?: string;
}

export class BindPermissionsDTO {
  @IsArray({ message: '权限代码必须是数组' })
  @IsString({ each: true, message: '每个权限代码必须是字符串' })
  permissionCodes: string[];
}

export class OpUserWithAccountVO {
  id: string;
  opIdentityId: string;
  isSuper: boolean;
  createdAt: Date;
  updatedAt: Date;
  account?: OpAccount;
  dept?: unknown;

  static fromOpUser(opUser: OpUser): OpUserWithAccountVO {
    const vo = new OpUserWithAccountVO();
    vo.id = opUser.id;
    vo.opIdentityId = opUser.identityId;
    vo.isSuper = opUser.isSuper;
    vo.createdAt = opUser.createdAt;
    vo.updatedAt = opUser.updatedAt;
    vo.account = opUser.identity?.opAccount;
    vo.dept = opUser.dept;
    return vo;
  }
}

export class BindUsersDTO {
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}
