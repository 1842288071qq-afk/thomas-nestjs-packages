-- =============================================================================
-- 系统管理 (SYS) 模块
-- =============================================================================

-- 1. 文件存储配置表
CREATE TABLE sys_oss_config (
  code VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  bucket VARCHAR(255) NOT NULL,
  endpoint VARCHAR(512) NOT NULL,
  config JSONB DEFAULT '{}',
  remark TEXT,
  created_by BIGINT,
  updated_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sys_oss_config IS '系统文件存储配置表，支持多种 OSS 配置';
COMMENT ON COLUMN sys_oss_config.code IS '配置唯一标识（主键）';
COMMENT ON COLUMN sys_oss_config.name IS '配置描述名称';
COMMENT ON COLUMN sys_oss_config.bucket IS '存储桶名称';
COMMENT ON COLUMN sys_oss_config.endpoint IS 'OSS 端点地址';
COMMENT ON COLUMN sys_oss_config.config IS '自由配置，JSON 格式，存储 AK/SK/Region 等';
COMMENT ON COLUMN sys_oss_config.remark IS '备注说明';
COMMENT ON COLUMN sys_oss_config.created_by IS '创建人 ID';
COMMENT ON COLUMN sys_oss_config.updated_by IS '更新人 ID';
COMMENT ON COLUMN sys_oss_config.created_at IS '创建时间';
COMMENT ON COLUMN sys_oss_config.updated_at IS '更新时间';


-- 2. 文件存储表
CREATE TABLE sys_file (
  id BIGSERIAL PRIMARY KEY,
  filename VARCHAR(512) NOT NULL,
  mime_type VARCHAR(128),
  suffix VARCHAR(32),
  meta JSONB DEFAULT '{}',
  object VARCHAR(1024) NOT NULL,
  hash VARCHAR(128),
  domain VARCHAR(512),
  full_url TEXT,
  storage_type VARCHAR(32) NOT NULL,
  upload_id VARCHAR(128),
  chunk_size BIGINT,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  size BIGINT,
  author_type VARCHAR(64),
  oss_config_code VARCHAR(64),
  created_by BIGINT,
  updated_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE sys_file IS '系统文件存储表，记录所有上传和管理的文件元信息';
COMMENT ON COLUMN sys_file.id IS '主键，自增';
COMMENT ON COLUMN sys_file.filename IS '文件名（含后缀）';
COMMENT ON COLUMN sys_file.mime_type IS 'MIME 类型，如 image/png、application/pdf 等';
COMMENT ON COLUMN sys_file.suffix IS '文件后缀名';
COMMENT ON COLUMN sys_file.meta IS '其他自由属性，JSON 格式存储';
COMMENT ON COLUMN sys_file.object IS '文件对象描述，本地相对路径或 OSS Key';
COMMENT ON COLUMN sys_file.hash IS '文件哈希（用于去重/校验）';
COMMENT ON COLUMN sys_file.domain IS '访问域名';
COMMENT ON COLUMN sys_file.full_url IS '完整访问 URL';
COMMENT ON COLUMN sys_file.storage_type IS '存储类型，local: 本地存储, oss: 对象存储';
COMMENT ON COLUMN sys_file.upload_id IS '分片上传 ID';
COMMENT ON COLUMN sys_file.chunk_size IS '分片大小（字节）';
COMMENT ON COLUMN sys_file.completed IS '是否完成上传合并';
COMMENT ON COLUMN sys_file.size IS '文件大小（字节）';
COMMENT ON COLUMN sys_file.author_type IS '作者类型，业务类型标识';
COMMENT ON COLUMN sys_file.oss_config_code IS '关联的 OSS 配置 Code，参考 sys_oss_config.code';
COMMENT ON COLUMN sys_file.created_by IS '创建人 ID';
COMMENT ON COLUMN sys_file.updated_by IS '更新人 ID';
COMMENT ON COLUMN sys_file.created_at IS '创建时间';
COMMENT ON COLUMN sys_file.updated_at IS '更新时间';
COMMENT ON COLUMN sys_file.deleted_at IS '逻辑删除时间';

CREATE INDEX idx_sys_file_storage_type ON sys_file (storage_type);
CREATE INDEX idx_sys_file_object_hash ON sys_file (object, hash);
CREATE INDEX idx_sys_file_oss_config_code ON sys_file (oss_config_code);
CREATE INDEX idx_sys_file_created_at ON sys_file (created_at);
CREATE INDEX idx_sys_file_deleted_at ON sys_file (deleted_at);
