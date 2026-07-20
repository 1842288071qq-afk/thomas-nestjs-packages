import { plainToInstance } from 'class-transformer';
import {
  OssAddressingStyle,
  OssProvider,
} from '@thomas/nestjs/entities/core/sys/oss-s3-config.interface';
import type { SysOssConfigEntity } from '@thomas/nestjs/entities/core/sys/sys-oss-config.entity';
import { OssConfigVO } from './vo/oss-config.types';

export function toOssConfigVO(entity: SysOssConfigEntity): OssConfigVO {
  const config = entity.config;
  const addressingStyle =
    config.addressingStyle ??
    (config.forcePathStyle
      ? OssAddressingStyle.PATH
      : OssAddressingStyle.VIRTUAL_HOSTED);
  return plainToInstance(OssConfigVO, {
    code: entity.code,
    name: entity.name,
    remark: entity.remark,
    bucket: entity.bucket,
    endpoint: entity.endpoint,
    internalEndpoint: entity.internalEndpoint,
    useInternalEndpoint: entity.useInternalEndpoint ?? false,
    config: {
      provider: config.provider ?? OssProvider.S3,
      addressingStyle,
      region: config.region,
      domain: config.domain,
      signingExpiresIn: config.signingExpiresIn,
      multipartChunkSize:
        config.multipartChunkSize ?? config.chunkSize ?? undefined,
      accessKeyIdMasked: maskAccessKeyId(config.accessKeyId),
      hasSecretAccessKey: !!config.secretAccessKey,
      hasSessionToken: !!config.sessionToken,
    },
    createdBy: entity.createdBy,
    updatedBy: entity.updatedBy,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}

function maskAccessKeyId(value: string): string {
  if (!value) return '';
  if (value.length <= 8) return `${value.slice(0, 2)}****`;
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}
