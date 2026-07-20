import { Check, Column, Entity, PrimaryColumn } from 'typeorm';
import { WithAuditor, WithTimeTrace } from '../base/extendable';
import type { OssS3Config } from './oss-s3-config.interface';

class SysOssConfigEntityRoot {}

@Entity('sys_oss_config')
@Check(
  'chk_sys_oss_config_internal_endpoint_enabled',
  'NOT "use_internal_endpoint" OR NULLIF(BTRIM("internal_endpoint"), \'\') IS NOT NULL',
)
export class SysOssConfigEntity extends WithAuditor(
  WithTimeTrace(SysOssConfigEntityRoot),
) {
  @Column({ type: 'varchar', length: 255, comment: '配置描述名称' })
  name: string;

  @PrimaryColumn({ type: 'varchar', length: 64, comment: '业务识别码（主键）' })
  code: string;

  @Column({ type: 'text', nullable: true, comment: '备注说明' })
  remark?: string;

  @Column({ type: 'varchar', length: 255, comment: '存储桶名称' })
  bucket: string;

  @Column({ type: 'varchar', length: 512, comment: '公网 OSS 端点地址' })
  endpoint: string;

  @Column({
    name: 'internal_endpoint',
    type: 'varchar',
    length: 512,
    nullable: true,
    comment: '服务端内网 OSS 端点地址',
  })
  internalEndpoint?: string | null;

  @Column({
    name: 'use_internal_endpoint',
    type: 'boolean',
    default: false,
    comment: '服务端对象操作是否使用内网端点',
  })
  useInternalEndpoint: boolean;

  @Column({ type: 'jsonb', default: {}, comment: 'S3 协议配置' })
  config: OssS3Config;
}
