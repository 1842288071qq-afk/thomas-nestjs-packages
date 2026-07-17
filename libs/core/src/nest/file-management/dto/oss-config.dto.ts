import { Type } from 'class-transformer';
import { OmitType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  OssAddressingStyle,
  OssProvider,
  OssS3Config,
} from '@thomas/nestjs/entities/core/sys/oss-s3-config.interface';

export class OssS3ConfigDto implements OssS3Config {
  @IsNotEmpty({ message: 'accessKeyId 不能为空' })
  @IsString()
  accessKeyId: string;

  @IsNotEmpty({ message: 'secretAccessKey 不能为空' })
  @IsString()
  secretAccessKey: string;

  @IsNotEmpty({ message: 'region 不能为空' })
  @IsString()
  region: string;

  @IsOptional()
  @IsString()
  sessionToken?: string;

  @IsOptional()
  @IsEnum(OssProvider)
  provider?: OssProvider;

  @IsOptional()
  @IsEnum(OssAddressingStyle)
  addressingStyle?: OssAddressingStyle;

  @IsOptional()
  @IsBoolean()
  forcePathStyle?: boolean;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  signingExpiresIn?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  multipartChunkSize?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  chunkSize?: number;

  @IsOptional()
  @IsObject()
  extensions?: Record<string, unknown>;
}

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

  @ValidateNested()
  @Type(() => OssS3ConfigDto)
  config: OssS3ConfigDto;
}

export class UpdateOssConfigDto extends OmitType(CreateOssConfigDto, [
  'code',
] as const) {}
