import { IsChinaPhoneNumber } from '@thomas/nestjs/core';
import {
  ICreateUserParams,
  IUserQueryParams,
  IUpdateUserParams,
} from '../../../shared/services/user-shared.service';
import { EnsureNotBlank } from '@thomas/nestjs/core/nest/composition/ensure-not-blank.decorator';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBizUserDTO implements ICreateUserParams {
  @EnsureNotBlank({ message: '用户名不能为空' })
  username: string;

  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  @MinLength(6, { message: '密码长度至少6位' })
  password: string;

  @EnsureNotBlank()
  name: string;

  @IsOptional()
  @IsChinaPhoneNumber()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  enable?: string;
}

export class UpdateBizUserDTO implements IUpdateUserParams {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsChinaPhoneNumber()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  enable?: string;
}

export class BizUserQueryDTO implements IUserQueryParams {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  enable?: string;
}
