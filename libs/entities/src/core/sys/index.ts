import { SysFileEntity } from './sys-file.entity';
import { SysOssConfigEntity } from './sys-oss-config.entity';

export const SysEntities = [SysFileEntity, SysOssConfigEntity];

export * from './oss-s3-config.interface';
export * from './sys-file.entity';
export * from './sys-oss-config.entity';
