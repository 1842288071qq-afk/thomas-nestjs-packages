import { Entity, Column, JoinColumn, ManyToOne } from 'typeorm';
import {
  WithSoftDelete,
  WithAuditor,
  WithTimeTrace,
  WithId,
} from '../base/extendable';
import { SysOssConfigEntity } from './sys-oss-config.entity';

@Entity('sys_file')
class SysFileEntityRoot {}
export class SysFileEntity extends WithSoftDelete(
  WithAuditor(WithTimeTrace(WithId(SysFileEntityRoot))),
) {
  @Column({ comment: '文件名 (含后缀)' })
  filename: string;

  @Column({ name: 'mime_type', nullable: true, comment: 'MIME 类型' })
  mimeType?: string;

  @Column({ nullable: true, comment: '后缀名' })
  suffix?: string;

  @Column({ type: 'jsonb', default: {}, comment: '其他自由属性 json 存储' })
  meta: Record<string, any>;

  @Column({ comment: '文件对象描述 (本地相对路径或 OSS Key)' })
  object: string;

  @Column({ nullable: true, comment: '文件哈希 (用于去重/校验)' })
  hash?: string;

  @Column({ nullable: true, comment: '访问域名' })
  domain?: string;

  @Column({
    name: 'full_url',
    type: 'text',
    nullable: true,
    comment: '完整访问 URL',
  })
  fullUrl?: string;

  @Column({ name: 'storage_type', comment: '存储类型: local, oss' })
  storageType: string;

  @Column({ name: 'upload_id', nullable: true, comment: '分片上传 ID' })
  uploadId?: string;

  @Column({ name: 'chunk_size', nullable: true, comment: '分片大小 (字节)' })
  chunkSize?: number;

  @Column({ default: false, comment: '是否完成上传合并' })
  completed: boolean;

  @Column({ nullable: true, comment: '文件大小 (字节)' })
  size?: string;

  @Column({
    name: 'author_type',
    nullable: true,
    comment: '作者类型 (业务类型)',
  })
  authorType?: string;

  @Column({
    name: 'oss_config_code',
    nullable: true,
    type: 'varchar',
    length: 64,
    comment: '关联的 OSS 配置 Code',
  })
  ossConfigCode?: string;

  @ManyToOne(() => SysOssConfigEntity)
  @JoinColumn({ name: 'oss_config_code', referencedColumnName: 'code' })
  ossConfig?: SysOssConfigEntity;
}
