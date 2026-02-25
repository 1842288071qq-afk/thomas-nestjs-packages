-- 系统统一身份表
CREATE TABLE identity (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL,
  account_source VARCHAR(32) NOT NULL,
  identity_type VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ
);

COMMENT ON TABLE identity IS '账号身份表，承载业务身份类型';
COMMENT ON COLUMN identity.id IS '身份主键，自增';
COMMENT ON COLUMN identity.account_id IS '关联 account.id，一个账号多身份';
COMMENT ON COLUMN identity.account_source IS '账号来源，示例值 internal|op_system|third_party';
COMMENT ON COLUMN identity.identity_type IS '身份类型，根据业务用户类型定义';
COMMENT ON COLUMN identity.status IS '身份状态，示例值 active|disabled';
COMMENT ON COLUMN identity.created_at IS '创建时间';
COMMENT ON COLUMN identity.updated_at IS '更新时间';
COMMENT ON COLUMN identity.deleted_at IS '逻辑删除时间';
COMMENT ON COLUMN identity.last_login_at IS '最后登录时间';
COMMENT ON COLUMN identity.last_active_at IS '最后活跃时间';

CREATE INDEX idx_identity_account ON identity (account_id);
CREATE INDEX idx_identity_type ON identity (identity_type);
