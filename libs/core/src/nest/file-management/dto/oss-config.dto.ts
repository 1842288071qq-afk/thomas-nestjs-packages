import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateOssConfigDto {
  @IsNotEmpty({ message: '名称不能为空' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: '识别码不能为空' })
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsNotEmpty({ message: '存储桶不能为空' })
  @IsString()
  bucket: string;

  @IsNotEmpty({ message: '端点不能为空' })
  @IsString()
  endpoint: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class UpdateOssConfigDto extends CreateOssConfigDto {}
