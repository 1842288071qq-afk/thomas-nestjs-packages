import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

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
  domain?: string;

  @IsOptional()
  @IsString()
  fullUrl?: string;

  @IsNotEmpty()
  @IsString()
  storageType: 'local' | 'oss';

  @IsOptional()
  @IsString()
  ossConfigId?: string;

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
