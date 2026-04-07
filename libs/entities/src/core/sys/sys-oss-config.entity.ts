import { Entity, Column, PrimaryColumn } from 'typeorm';
import { WithAuditor, WithTimeTrace } from '../base/extendable';
import type { OssS3Config } from './oss-s3-config.interface';

class SysOssConfigEntityRoot {}

@Entity('sys_oss_config')
export class SysOssConfigEntity extends WithAuditor(
  WithTimeTrace(SysOssConfigEntityRoot),
) {
  @Column({ comment: '配置描述名称' })
  name: string;

  @PrimaryColumn({ comment: '业务识别码（主键）' })
  code: string;

  @Column({ nullable: true, comment: '备注说明' })
  remark?: string;

  @Column({ comment: '存储桶名称' })
  bucket: string;

  @Column({ comment: 'OSS 端点地址' })
  endpoint: string;

  @Column({ type: 'jsonb', default: {}, comment: 'S3 协议配置' })
  config: OssS3Config;
}
