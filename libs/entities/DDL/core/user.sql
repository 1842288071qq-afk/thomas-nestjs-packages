-- =============================================================================
-- 通用业务 (Common Business) 用户管理系统
-- =============================================================================

-- 通用业务用户表
CREATE TABLE "user" (
  id BIGSERIAL PRIMARY KEY,
  identity_id BIGINT NOT NULL UNIQUE,
  name VARCHAR(64),
  phone VARCHAR(32),
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_by BIGINT,
  updated_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE "user" IS '通用业务用户表，跨项目通用，绑定 identity';
COMMENT ON COLUMN "user".id IS '主键，自增';
COMMENT ON COLUMN "user".identity_id IS '关联 identity.id，唯一约束，删除 identity 时级联删除';
COMMENT ON COLUMN "user".name IS '用户名称';
COMMENT ON COLUMN "user".phone IS '用户电话';
COMMENT ON COLUMN "user".status IS '是否启用，active: 启用, disabled: 禁用';
COMMENT ON COLUMN "user".created_by IS '创建人 ID，关联 identity.id';
COMMENT ON COLUMN "user".updated_by IS '更新人 ID，关联 identity.id';
COMMENT ON COLUMN "user".created_at IS '创建时间';
COMMENT ON COLUMN "user".updated_at IS '更新时间';
COMMENT ON COLUMN "user".deleted_at IS '逻辑删除时间';

CREATE UNIQUE INDEX uq_user_identity ON "user" (identity_id);
CREATE INDEX idx_user_status ON "user" (status);
CREATE INDEX idx_user_created_at ON "user" (created_at);
CREATE INDEX idx_user_deleted_at ON "user" (deleted_at);
