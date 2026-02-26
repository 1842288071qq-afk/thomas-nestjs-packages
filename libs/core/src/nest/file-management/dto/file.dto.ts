import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';

export class CreateFileDto {
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
  meta?: Record<string, any>;

  @IsNotEmpty()
  @IsString()
  object: string;

  @IsOptional()
  @IsString()
  hash?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  fullUrl?: string;

  @IsNotEmpty()
  @IsString()
  storageType: 'local' | 'oss';

  @IsOptional()
  @IsString()
  uploadId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  chunkSize?: number;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsString()
  ossConfigCode?: string;

  @IsOptional()
  @IsString()
  size?: string;
}

export class FileQueryDto {
  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsString()
  storageType?: string;
}
