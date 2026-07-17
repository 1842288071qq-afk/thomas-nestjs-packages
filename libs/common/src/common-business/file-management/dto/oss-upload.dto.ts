import { ObjectCannedACL } from '@aws-sdk/client-s3';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
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
  filename: string;

  @IsNotEmpty()
  @IsString()
  object: string;

  @IsNotEmpty()
  @IsString()
  ossConfigCode: string;

  @IsOptional()
  @IsString()
  hash?: string;

  @IsOptional()
  @IsString()
  suffix?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

export class OssGetSignDto {
  @IsNotEmpty()
  @IsString()
  ossConfigCode: string;

  @IsNotEmpty()
  @IsString()
  key: string;

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

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chunkSize?: number;
}

export class OssMultipartSignPartDto {
  @IsNotEmpty()
  @IsString()
  ossConfigCode: string;

  @IsNotEmpty()
  @IsString()
  key: string;

  @IsNotEmpty()
  @IsString()
  uploadId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  partNumber: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contentLength?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7 * 24 * 3600)
  expiresIn?: number;
}

export class OssMultipartPartDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  partNumber: number;

  @IsNotEmpty()
  @IsString()
  eTag: string;
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
