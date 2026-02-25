import { Entity, Column } from 'typeorm';
import { WithAuditor, WithTimeTrace, WithId } from '../base/extendable';
import type { OssS3Config } from './oss-s3-config.interface';

@Entity('sys_oss_config')
class SysOssConfigEntityRoot {}
export class SysOssConfigEntity extends WithAuditor(
  WithTimeTrace(WithId(SysOssConfigEntityRoot)),
) {
  @Column({ comment: '配置描述名称' })
  name: string;

  @Column({ unique: true, comment: '业务识别码' })
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
