CREATE TABLE account (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(64) NOT NULL,
  phone VARCHAR(32),
  nickname VARCHAR(64),
  real_name VARCHAR(64),
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMPTZ,
  UNIQUE (username),
  UNIQUE (phone)
);

COMMENT ON TABLE account IS '统一账号主表';
COMMENT ON COLUMN account.id IS '账号主键，自增';
COMMENT ON COLUMN account.username IS '账号登录名，唯一，用于用户名登录';
COMMENT ON COLUMN account.phone IS '手机号，支持短信登录';
COMMENT ON COLUMN account.nickname IS '昵称，用于展示';
COMMENT ON COLUMN account.real_name IS '实名信息，可选';
COMMENT ON COLUMN account.status IS '账号状态，示例值 active|frozen|disabled';
COMMENT ON COLUMN account.created_at IS '创建时间';
COMMENT ON COLUMN account.updated_at IS '更新时间';
COMMENT ON COLUMN account.last_login_at IS '最后登录时间';

CREATE TABLE account_profile (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL,
  avatar_url VARCHAR(255),
  gender VARCHAR(16),
  birth_date DATE,
  province VARCHAR(64),
  city VARCHAR(64),
  extra JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (account_id)
);

COMMENT ON TABLE account_profile IS '账号附加资料表';
COMMENT ON COLUMN account_profile.id IS '资料主键，自增';
COMMENT ON COLUMN account_profile.account_id IS '关联 account.id，保持一对一';
COMMENT ON COLUMN account_profile.avatar_url IS '头像链接';
COMMENT ON COLUMN account_profile.gender IS '性别，示例值 male|female|unknown';
COMMENT ON COLUMN account_profile.birth_date IS '生日';
COMMENT ON COLUMN account_profile.province IS '所在省份';
COMMENT ON COLUMN account_profile.city IS '所在城市';
COMMENT ON COLUMN account_profile.extra IS '附加 JSON 信息，存放个性化字段';
COMMENT ON COLUMN account_profile.created_at IS '创建时间';
COMMENT ON COLUMN account_profile.updated_at IS '更新时间';


CREATE TABLE account_credential (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL,
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
  UNIQUE (account_id, type, identifier)
);

COMMENT ON TABLE account_credential IS '账号多种登录凭证表';
COMMENT ON COLUMN account_credential.id IS '凭证主键，自增';
COMMENT ON COLUMN account_credential.account_id IS '关联 account.id';
COMMENT ON COLUMN account_credential.type IS '凭证类型，示例值 password|sms|oauth';
COMMENT ON COLUMN account_credential.identifier IS '凭证标识，手机号/用户名/三方 openid';
COMMENT ON COLUMN account_credential.secret IS '密钥或哈希值，视凭证类型而定';
COMMENT ON COLUMN account_credential.salt IS '加盐或扩展字段';
COMMENT ON COLUMN account_credential.provider IS '第三方提供方，如 wechat|apple';
COMMENT ON COLUMN account_credential.expire_at IS '凭证失效时间，短信/三方有效期';
COMMENT ON COLUMN account_credential.is_primary IS '是否首选凭证';
COMMENT ON COLUMN account_credential.status IS '凭证状态，示例值 active|disabled|expired';
COMMENT ON COLUMN account_credential.created_at IS '创建时间';
COMMENT ON COLUMN account_credential.updated_at IS '更新时间';

CREATE INDEX idx_account_credential_account ON account_credential (account_id);
CREATE INDEX idx_account_credential_identifier ON account_credential (identifier);


CREATE TABLE account_channel_binding (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL,
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

COMMENT ON TABLE account_channel_binding IS '账号第三方渠道绑定信息';
COMMENT ON COLUMN account_channel_binding.id IS '主键';
COMMENT ON COLUMN account_channel_binding.account_id IS '关联账号ID';
COMMENT ON COLUMN account_channel_binding.channel IS '渠道标识，如 wechat、dingtalk、apple、google';
COMMENT ON COLUMN account_channel_binding.external_user_id IS '外部平台的用户唯一ID，如微信 openid、钉钉 userId';
COMMENT ON COLUMN account_channel_binding.external_union_id IS '外部平台的全局唯一ID，如 unionid';
COMMENT ON COLUMN account_channel_binding.access_token IS '外部平台 access_token（可选）';
COMMENT ON COLUMN account_channel_binding.refresh_token IS '外部平台 refresh_token（可选）';
COMMENT ON COLUMN account_channel_binding.avatar_url IS '外部平台头像URL';
COMMENT ON COLUMN account_channel_binding.nickname IS '外部平台昵称';
COMMENT ON COLUMN account_channel_binding.binding_status IS '绑定状态：1=绑定，0=解绑';
COMMENT ON COLUMN account_channel_binding.authorized_scopes IS '授权范围（scope），用逗号分隔';
COMMENT ON COLUMN account_channel_binding.last_authorized_at IS '最近一次授权时间';
COMMENT ON COLUMN account_channel_binding.created_at IS '记录创建时间';
COMMENT ON COLUMN account_channel_binding.updated_at IS '记录更新时间';

CREATE INDEX idx_account_id ON account_channel_binding (account_id);


CREATE TABLE login_audit (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL,
  identity_id BIGINT,
  channel VARCHAR(32),
  ip VARCHAR(45),
  user_agent VARCHAR(255),
  success BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE login_audit IS '医院用户登录审计日志表';
COMMENT ON COLUMN login_audit.id IS '医院用户登录审计记录主键';
COMMENT ON COLUMN login_audit.account_id IS '关联 account.id';
COMMENT ON COLUMN login_audit.identity_id IS '关联 account_identity.id，匿名登录时可为空';
COMMENT ON COLUMN login_audit.channel IS '登录渠道，如 mini_program|web|ios';
COMMENT ON COLUMN login_audit.ip IS '登录 IP，支持 IPv6';
COMMENT ON COLUMN login_audit.user_agent IS '用户代理信息';
COMMENT ON COLUMN login_audit.success IS '是否登录成功';
COMMENT ON COLUMN login_audit.created_at IS '记录时间';
COMMENT ON COLUMN login_audit.updated_at IS '更新时间';

CREATE INDEX idx_login_audit_account_created ON login_audit (account_id, created_at);
CREATE INDEX idx_login_audit_identity_created ON login_audit (identity_id, created_at);

