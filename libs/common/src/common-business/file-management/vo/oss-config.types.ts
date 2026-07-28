import {
  OssAddressingStyle,
  OssProvider,
} from '@qyy-code-lego/nestjs/entities/core/sys/oss-s3-config.interface';

export class OssConfigSafeConfigVO {
  provider: OssProvider;
  addressingStyle: OssAddressingStyle;
  region: string;
  domain?: string;
  signingExpiresIn?: number;
  multipartChunkSize?: number;
  accessKeyIdMasked: string;
  hasSecretAccessKey: boolean;
  hasSessionToken: boolean;
}

export class OssConfigVO {
  code: string;
  name: string;
  remark?: string;
  bucket: string;
  endpoint: string;
  internalEndpoint?: string;
  useInternalEndpoint: boolean;
  config: OssConfigSafeConfigVO;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class OssConfigConnectionTestVO {
  success: boolean;
  bucket: string;
}
