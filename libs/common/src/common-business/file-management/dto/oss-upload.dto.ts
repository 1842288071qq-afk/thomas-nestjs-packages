import { ObjectCannedACL } from '@aws-sdk/client-s3';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class OssPutSignDto {
  @IsNotEmpty()
  @IsString()
  ossConfigCode: string;

  @IsNotEmpty()
  @IsString()
  key: string;

  @IsNotEmpty()
  @IsString()
  filename: string;

  @IsNotEmpty()
  @IsString()
  hash: string;

  @IsString()
  @Matches(/^(0|[1-9]\d*)$/, { message: 'size 必须为非负整数字符串' })
  size: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Za-z0-9+/]{22}==$/, { message: 'contentMd5 格式不正确' })
  contentMd5: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsString()
  cacheControl?: string;

  @IsOptional()
  @IsString()
  contentDisposition?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  acl?: ObjectCannedACL;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7 * 24 * 3600)
  expiresIn?: number;
}

export class OssUploadCallbackDto {
  @IsNotEmpty()
  @IsString()
  fileId: string;
}

export class OssGetSignDto {
  @IsNotEmpty()
  @IsString()
  fileId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7 * 24 * 3600)
  expiresIn?: number;

  @IsOptional()
  @IsString()
  responseContentType?: string;

  @IsOptional()
  @IsString()
  responseContentDisposition?: string;
}

export class OssMultipartInitDto {
  @IsNotEmpty()
  @IsString()
  ossConfigCode: string;

  @IsNotEmpty()
  @IsString()
  key: string;

  @IsNotEmpty()
  @IsString()
  hash: string;

  @IsNotEmpty()
  @IsString()
  filename: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsString()
  cacheControl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;

  @IsOptional()
  @IsString()
  acl?: ObjectCannedACL;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  suffix?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsString()
  @Matches(/^[1-9]\d*$/, { message: 'size 必须为正整数字符串' })
  size: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chunkSize?: number;
}

export class OssMultipartSignPartDto {
  @IsNotEmpty()
  @IsString()
  fileId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  partNumber: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  contentLength: number;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Za-z0-9+/]{22}==$/, { message: 'contentMd5 格式不正确' })
  contentMd5: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7 * 24 * 3600)
  expiresIn?: number;
}

export class OssMultipartCompleteDto {
  @IsNotEmpty()
  @IsString()
  fileId: string;
}

export class OssMultipartAbortDto {
  @IsNotEmpty()
  @IsString()
  fileId: string;
}
