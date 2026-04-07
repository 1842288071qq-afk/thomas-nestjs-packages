import { SysFileEntity } from './sys-file.entity';
import { SysOssConfigEntity } from './sys-oss-config.entity';
import { CoreRequestLogEntity } from './core-request-log.entity';

export const SysEntities = [
  SysFileEntity,
  SysOssConfigEntity,
  CoreRequestLogEntity,
];

export * from './oss-s3-config.interface';
export * from './core-request-log.entity';
export * from './sys-file.entity';
export * from './sys-oss-config.entity';
