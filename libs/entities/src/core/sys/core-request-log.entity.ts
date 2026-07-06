import { Column, CreateDateColumn, Entity, Index } from 'typeorm';
import { WithId } from '../base/extendable';

class CoreRequestLogEntityRoot {}

@Entity('core_request_log')
@Index('idx_core_request_log_system_created_at', ['systemType', 'createdAt'])
@Index('idx_core_request_log_account_created_at', ['accountId', 'createdAt'])
@Index('idx_core_request_log_identity_created_at', ['identityId', 'createdAt'])
@Index('idx_core_request_log_request_id', ['requestId'])
@Index('idx_core_request_log_http_status_created_at', [
  'httpStatus',
  'createdAt',
])
export class CoreRequestLogEntity extends WithId(CoreRequestLogEntityRoot) {
  @Column({
    name: 'system_type',
    type: 'varchar',
    length: 32,
    comment: '系统类型',
  })
  systemType: string;

  @Column({
    name: 'account_id',
    type: 'bigint',
    nullable: true,
    comment: '账号ID',
  })
  accountId?: string;

  @Column({
    name: 'account_source',
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: '账号来源',
  })
  accountSource?: string;

  @Column({
    name: 'identity_id',
    type: 'bigint',
    nullable: true,
    comment: '身份ID',
  })
  identityId?: string;

  @Column({
    name: 'request_id',
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: '请求ID',
  })
  requestId?: string;

  @Column({
    type: 'varchar',
    length: 16,
    comment: 'HTTP方法',
  })
  method: string;

  @Column({
    name: 'request_at',
    type: 'timestamptz',
    comment: '请求发起时间',
  })
  requestAt: Date;

  @Column({
    name: 'full_path',
    type: 'text',
    comment: '请求完整路径',
  })
  fullPath: string;

  @Column({
    type: 'text',
    comment: '请求路径（不含query）',
  })
  path: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'query参数',
  })
  query?: Record<string, any>;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'path参数',
  })
  params?: Record<string, any>;

  @Column({
    name: 'request_body',
    type: 'jsonb',
    nullable: true,
    comment: '请求体（按需记录）',
  })
  requestBody?: any;

  @Column({
    name: 'response_body',
    type: 'jsonb',
    nullable: true,
    comment: '响应体（按需记录）',
  })
  responseBody?: any;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '请求头',
  })
  headers?: Record<string, any>;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: '客户端IP',
  })
  ip?: string;

  @Column({
    name: 'user_agent',
    type: 'varchar',
    length: 512,
    nullable: true,
    comment: '客户端UA',
  })
  userAgent?: string;

  @Column({
    name: 'cost_ms',
    type: 'int',
    comment: '请求耗时ms',
  })
  costMs: number;

  @Column({
    name: 'http_status',
    type: 'int',
    comment: 'HTTP状态码',
  })
  httpStatus: number;

  @Column({
    name: 'biz_code',
    type: 'int',
    nullable: true,
    comment: '返回体业务码',
  })
  bizCode?: number;

  @Column({
    type: 'boolean',
    default: true,
    comment: '是否成功',
  })
  success: boolean;

  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
    comment: '错误信息',
  })
  errorMessage?: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;
}
