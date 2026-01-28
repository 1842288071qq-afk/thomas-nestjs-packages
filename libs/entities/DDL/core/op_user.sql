-- =============================================================================
-- 运营平台 (OP) 权限与角色系统
-- =============================================================================

-- 1. 运营平台权限表
CREATE TABLE op_permission (
  code VARCHAR(64) PRIMARY KEY,
  type VARCHAR(16) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  description TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE op_permission IS '运营平台权限表，使用 code 作为主键';
COMMENT ON COLUMN op_permission.code IS '权限唯一标识，作为主键使用';
COMMENT ON COLUMN op_permission.type IS '权限类型，示例值 menu|biz';
COMMENT ON COLUMN op_permission.display_name IS '权限名称，展示使用';
COMMENT ON COLUMN op_permission.description IS '权限说明';
COMMENT ON COLUMN op_permission.status IS '状态，示例值 active|deprecated';
COMMENT ON COLUMN op_permission.created_at IS '创建时间';
COMMENT ON COLUMN op_permission.updated_at IS '更新时间';

CREATE INDEX idx_op_permission_type ON op_permission (type);
CREATE INDEX idx_op_permission_status ON op_permission (status);


-- 2. 运营平台角色表
CREATE TABLE op_role (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  created_admin_id BIGINT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  UNIQUE (name)
);

COMMENT ON TABLE op_role IS '运营平台角色表';
COMMENT ON COLUMN op_role.id IS '主键，自增';
COMMENT ON COLUMN op_role.code IS '角色编码';
COMMENT ON COLUMN op_role.name IS '角色名称，唯一';
COMMENT ON COLUMN op_role.created_admin_id IS '创建该角色的管理员ID';
COMMENT ON COLUMN op_role.description IS '角色描述';
COMMENT ON COLUMN op_role.status IS '是否启用，active: 启用, disabled: 禁用';
COMMENT ON COLUMN op_role.created_at IS '创建时间';
COMMENT ON COLUMN op_role.updated_at IS '更新时间';

CREATE INDEX idx_op_role_code ON op_role (code);


-- 3. 运营角色与权限关联表 (Role-Permission Junction)
CREATE TABLE op_role_permission (
  id BIGSERIAL PRIMARY KEY,
  role_id BIGINT NOT NULL,
  permission_code VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (role_id, permission_code)
);

COMMENT ON TABLE op_role_permission IS '运营角色与权限关联表';
COMMENT ON COLUMN op_role_permission.id IS '主键';
COMMENT ON COLUMN op_role_permission.role_id IS '关联 op_role.id';
COMMENT ON COLUMN op_role_permission.permission_code IS '关联 op_permission.code';
COMMENT ON COLUMN op_role_permission.created_at IS '分配权限时间';

CREATE INDEX idx_op_role_permission_code ON op_role_permission (permission_code);


-- 4. 运营用户与角色绑定表 (User-Role Junction)
CREATE TABLE op_user_role (
  id BIGSERIAL PRIMARY KEY,
  op_user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  assigned_admin_id BIGINT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (op_user_id, role_id)
);

COMMENT ON TABLE op_user_role IS '运营用户与角色的绑定关系表';
COMMENT ON COLUMN op_user_role.id IS '主键';
COMMENT ON COLUMN op_user_role.op_user_id IS '关联 op_user.id';
COMMENT ON COLUMN op_user_role.role_id IS '关联 op_role.id';
COMMENT ON COLUMN op_user_role.assigned_admin_id IS '指派该角色的管理员ID';
COMMENT ON COLUMN op_user_role.assigned_at IS '指派时间';

CREATE INDEX idx_op_user_role_role ON op_user_role (role_id);


-- =============================================================================
-- 运营平台 (OP) 部门管理系统
-- =============================================================================

-- 1. 运营平台部门表
create table op_dept
(
    id             bigserial
        primary key,
    parent_dept_id bigint,
    name           varchar(128)                                       not null,
    depth          integer                  default 0                 not null,
    id_path        varchar(1024)                                      not null,
    order_index    integer                  default 0                 not null,
    created_by     bigint,
    updated_by     bigint,
    created_at     timestamp with time zone default CURRENT_TIMESTAMP not null,
    updated_at     timestamp with time zone default CURRENT_TIMESTAMP not null,
    is_default     boolean                  default false
);

comment on table op_dept is '运营平台部门表';

comment on column op_dept.id is '部门主键';

comment on column op_dept.parent_dept_id is '父部门ID，根部门为NULL';

comment on column op_dept.name is '部门名称';

comment on column op_dept.depth is '层级深度，根部门为0';

comment on column op_dept.id_path is '逗号分隔的ID路径，如 1,2,3';

comment on column op_dept.order_index is '排序索引';

comment on column op_dept.created_by is '创建人ID，关联 op_user.id';

comment on column op_dept.updated_by is '更新人ID，关联 op_user.id';

comment on column op_dept.created_at is '创建时间';

comment on column op_dept.updated_at is '更新时间';

comment on column op_dept.is_default is '是否默认部门';

alter table op_dept
    owner to postgres;

create index idx_op_dept_parent
    on op_dept (parent_dept_id);

create unique index uq_op_dept_id_path
    on op_dept (id_path);

grant delete, insert, references, select, trigger, truncate, update on op_dept to wjy2026_user;




-- 2. 运营平台部门闭包表 (用于快速查询祖先/后代关系)
create table op_dept_closure
(
    ancestor_dept_id   bigint  not null,
    descendant_dept_id bigint  not null,
    distance           integer not null,
    primary key (ancestor_dept_id, descendant_dept_id)
);

comment on table op_dept_closure is '运营平台部门闭包表，用于快速查询祖先/后代关系';

comment on column op_dept_closure.ancestor_dept_id is '祖先部门ID';

comment on column op_dept_closure.descendant_dept_id is '后代部门ID';

comment on column op_dept_closure.distance is '层级距离，0表示自身';

alter table op_dept_closure
    owner to postgres;

create index idx_op_dept_closure_descendant
    on op_dept_closure (descendant_dept_id);

create index idx_op_dept_closure_ancestor_descendant
    on op_dept_closure (ancestor_dept_id, descendant_dept_id);

grant delete, insert, references, select, trigger, truncate, update on op_dept_closure to wjy2026_user;

