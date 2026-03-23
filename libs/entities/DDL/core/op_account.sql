CREATE TABLE op_account (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  phone VARCHAR(32),
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ
);

COMMENT ON TABLE op_account IS '运营用户统一账号主表';
COMMENT ON COLUMN op_account.id IS '运营用户账号主键，自增';
COMMENT ON COLUMN op_account.username IS '运营用户账号登录名，用于用户名登录';
COMMENT ON COLUMN op_account.phone IS '运营用户手机号，支持短信登录';
COMMENT ON COLUMN op_account.status IS '运营用户账号状态，示例值 active|disabled';
COMMENT ON COLUMN op_account.created_at IS '创建时间';
COMMENT ON COLUMN op_account.updated_at IS '更新时间';
COMMENT ON COLUMN op_account.deleted_at IS '逻辑删除时间';
COMMENT ON COLUMN op_account.last_login_at IS '运营用户最后登录时间';

CREATE INDEX idx_op_account_username ON op_account (username);

CREATE TABLE op_account_profile (
  id BIGSERIAL PRIMARY KEY,
  op_account_id BIGINT NOT NULL,
  nickname VARCHAR(64),
  real_name VARCHAR(64),
  avatar_url VARCHAR(255),
  gender VARCHAR(16),
  birth_date DATE,
  province VARCHAR(64),
  city VARCHAR(64),
  extra JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (op_account_id)
);

COMMENT ON TABLE op_account_profile IS '运营用户账号附加资料表';
COMMENT ON COLUMN op_account_profile.id IS '运营用户资料主键，自增';
COMMENT ON COLUMN op_account_profile.op_account_id IS '关联 op_account.id，保持一对一';
COMMENT ON COLUMN op_account_profile.nickname IS '运营用户昵称，用于展示';
COMMENT ON COLUMN op_account_profile.real_name IS '运营用户实名信息，可选';
COMMENT ON COLUMN op_account_profile.avatar_url IS '运营用户头像链接';
COMMENT ON COLUMN op_account_profile.gender IS '运营用户性别，示例值 male|female|unknown';
COMMENT ON COLUMN op_account_profile.birth_date IS '运营用户生日';
COMMENT ON COLUMN op_account_profile.province IS '运营用户所在省份';
COMMENT ON COLUMN op_account_profile.city IS '运营用户所在城市';
COMMENT ON COLUMN op_account_profile.extra IS '运营用户附加 JSON 信息，存放个性化字段';
COMMENT ON COLUMN op_account_profile.created_at IS '创建时间';
COMMENT ON COLUMN op_account_profile.updated_at IS '更新时间';

CREATE TABLE op_account_credential (
  id BIGSERIAL PRIMARY KEY,
  op_account_id BIGINT NOT NULL,
  type VARCHAR(32) NOT NULL,
  identifier VARCHAR(128) NOT NULL,
  secret VARCHAR(255),
  salt VARCHAR(64),
  provider VARCHAR(64),
  expire_at TIMESTAMP,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (op_account_id, type, identifier)
);

COMMENT ON TABLE op_account_credential IS '运营用户账号多种登录凭证表';
COMMENT ON COLUMN op_account_credential.id IS '运营用户凭证主键，自增';
COMMENT ON COLUMN op_account_credential.op_account_id IS '关联 op_account.id';
COMMENT ON COLUMN op_account_credential.type IS '运营用户凭证类型，示例值 password|sms|oauth';
COMMENT ON COLUMN op_account_credential.identifier IS '运营用户凭证标识，手机号/用户名/三方 openid';
COMMENT ON COLUMN op_account_credential.secret IS '运营用户密钥或哈希值，视凭证类型而定';
COMMENT ON COLUMN op_account_credential.salt IS '运营用户加盐或扩展字段';
COMMENT ON COLUMN op_account_credential.provider IS '运营用户第三方提供方，如 wechat|apple';
COMMENT ON COLUMN op_account_credential.expire_at IS '运营用户凭证失效时间，短信/三方有效期';
COMMENT ON COLUMN op_account_credential.is_primary IS '运营用户是否首选凭证';
COMMENT ON COLUMN op_account_credential.status IS '运营用户凭证状态，示例值 active|disabled|expired';
COMMENT ON COLUMN op_account_credential.created_at IS '创建时间';
COMMENT ON COLUMN op_account_credential.updated_at IS '更新时间';

CREATE INDEX idx_op_account_credential_account ON op_account_credential (op_account_id);
CREATE INDEX idx_op_account_credential_identifier ON op_account_credential (identifier);


CREATE TABLE op_account_channel_binding (
  id BIGSERIAL PRIMARY KEY,
  op_account_id BIGINT NOT NULL,
  channel VARCHAR(64) NOT NULL,
  external_user_id VARCHAR(128) NOT NULL,
  external_union_id VARCHAR(128),
  access_token VARCHAR(512),
  refresh_token VARCHAR(512),
  avatar_url VARCHAR(512),
  nickname VARCHAR(128),
  binding_status SMALLINT NOT NULL DEFAULT 1,
  authorized_scopes VARCHAR(512),
  last_authorized_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (channel, external_user_id)
);

COMMENT ON TABLE op_account_channel_binding IS '运营用户账号第三方渠道绑定信息';
COMMENT ON COLUMN op_account_channel_binding.id IS '主键';
COMMENT ON COLUMN op_account_channel_binding.op_account_id IS '关联运营用户账号ID';
COMMENT ON COLUMN op_account_channel_binding.channel IS '运营用户渠道标识，如 wechat、dingtalk、apple、google';
COMMENT ON COLUMN op_account_channel_binding.external_user_id IS '运营用户外部平台的用户唯一ID，如微信 openid、钉钉 userId';
COMMENT ON COLUMN op_account_channel_binding.external_union_id IS '运营用户外部平台的全局唯一ID，如 unionid';
COMMENT ON COLUMN op_account_channel_binding.access_token IS '运营用户外部平台 access_token（可选）';
COMMENT ON COLUMN op_account_channel_binding.refresh_token IS '运营用户外部平台 refresh_token（可选）';
COMMENT ON COLUMN op_account_channel_binding.avatar_url IS '运营用户外部平台头像URL';
COMMENT ON COLUMN op_account_channel_binding.nickname IS '运营用户外部平台昵称';
COMMENT ON COLUMN op_account_channel_binding.binding_status IS '运营用户绑定状态：1=绑定，0=解绑';
COMMENT ON COLUMN op_account_channel_binding.authorized_scopes IS '运营用户授权范围（scope），用逗号分隔';
COMMENT ON COLUMN op_account_channel_binding.last_authorized_at IS '运营用户最近一次授权时间';
COMMENT ON COLUMN op_account_channel_binding.created_at IS '运营用户记录创建时间';
COMMENT ON COLUMN op_account_channel_binding.updated_at IS '运营用户记录更新时间';

CREATE INDEX idx_op_account_id ON op_account_channel_binding (op_account_id);


CREATE TABLE op_login_audit (
  id BIGSERIAL PRIMARY KEY,
  op_account_id BIGINT NOT NULL,
  op_identity_id BIGINT,
  channel VARCHAR(32),
  ip VARCHAR(45),
  user_agent VARCHAR(255),
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE op_login_audit IS '运营用户登录审计日志表';
COMMENT ON COLUMN op_login_audit.id IS '运营用户登录审计记录主键';
COMMENT ON COLUMN op_login_audit.op_account_id IS '关联 op_account.id';
COMMENT ON COLUMN op_login_audit.op_identity_id IS '关联 op_account_identity.id，匿名登录时可为空';
COMMENT ON COLUMN op_login_audit.channel IS '登录渠道，如 mini_program|web|ios';
COMMENT ON COLUMN op_login_audit.ip IS '登录 IP，支持 IPv6';
COMMENT ON COLUMN op_login_audit.user_agent IS '用户代理信息';
COMMENT ON COLUMN op_login_audit.success IS '是否登录成功';
COMMENT ON COLUMN op_login_audit.created_at IS '记录时间';
COMMENT ON COLUMN op_login_audit.updated_at IS '更新时间';

CREATE INDEX idx_op_login_audit_account_created ON op_login_audit (op_account_id, created_at);
CREATE INDEX idx_op_login_audit_identity_created ON op_login_audit (op_identity_id, created_at);



