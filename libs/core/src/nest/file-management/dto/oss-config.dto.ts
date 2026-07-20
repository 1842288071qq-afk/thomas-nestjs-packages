import { Type } from 'class-transformer';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsDefined,
  IsUrl,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
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
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ require_protocol: true })
  @IsString()
  domain?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7 * 24 * 3600)
  signingExpiresIn?: number;

  @IsOptional()
  @IsNumber()
  @Min(5 * 1024 * 1024)
  multipartChunkSize?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  chunkSize?: number;

  @IsOptional()
  @IsObject()
  extensions?: Record<string, unknown>;
}

export class UpdateOssS3ConfigDto extends PartialType(OssS3ConfigDto) {}

export class CreateOssConfigDto {
  @IsNotEmpty({ message: '名称不能为空' })
  @IsString()
  @MaxLength(255)
  name: string;

  @IsNotEmpty({ message: '识别码不能为空' })
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: '识别码只能包含字母、数字、下划线和中划线',
  })
  code: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsNotEmpty({ message: '存储桶不能为空' })
  @IsString()
  @MaxLength(255)
  bucket: string;

  @IsNotEmpty({ message: '端点不能为空' })
  @IsUrl({ require_protocol: true })
  @IsString()
  @MaxLength(512)
  endpoint: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsUrl({ require_protocol: true })
  @IsString()
  @MaxLength(512)
  internalEndpoint?: string;

  @IsOptional()
  @IsBoolean()
  useInternalEndpoint?: boolean;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => OssS3ConfigDto)
  config: OssS3ConfigDto;
}

export class UpdateOssConfigDto extends PartialType(
  OmitType(CreateOssConfigDto, ['code', 'config'] as const),
) {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateOssS3ConfigDto)
  declare config?: UpdateOssS3ConfigDto;
}

export class OssConfigPageQueryDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(OssProvider)
  provider?: OssProvider;
}
