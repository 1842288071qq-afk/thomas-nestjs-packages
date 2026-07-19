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

export class LocalMultipartInitDto {
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
  mimeType?: string;

  @IsOptional()
  @IsString()
  suffix?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;

  @IsString()
  @Matches(/^[1-9]\d*$/, { message: 'size 必须为正整数字符串' })
  size: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  chunkSize?: number;
}

export class LocalMultipartPartDto {
  @IsNotEmpty()
  @IsString()
  fileId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  partNumber: number;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Za-z0-9+/]{22}==$/, { message: 'contentMd5 格式不正确' })
  contentMd5: string;
}

export class LocalMultipartCompleteDto {
  @IsNotEmpty()
  @IsString()
  fileId: string;
}

export class LocalMultipartAbortDto extends LocalMultipartCompleteDto {}
