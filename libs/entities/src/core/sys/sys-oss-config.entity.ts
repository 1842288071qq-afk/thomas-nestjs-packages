import { Entity, Column } from 'typeorm';
import { EntityWithIdAndAuditor } from '../base/extendable';

@Entity('sys_oss_config')
export class SysOssConfigEntity extends EntityWithIdAndAuditor {
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

  @Column({ type: 'jsonb', default: {}, comment: '自由配置 (AK/SK/Region等)' })
  config: Record<string, any>;
}
