-- DATABASE_USER=nestjs_boilerplate
-- DATABASE_PASSWORD=nestjs_boilerplate
-- DATABASE_NAME=nestjs_boilerplate
-- 创建用户、设置密码、创建数据库、赋予权限、设置默认权限
create database nestjs_boilerplate;
create user nestjs_boilerplate with password 'nestjs_boilerplate';
grant all privileges on database nestjs_boilerplate to nestjs_boilerplate;
-- 切换到目标数据库后设置默认权限（ALTER DEFAULT PRIVILEGES 的 IN 子句需要 schema）
\connect nestjs_boilerplate

-- schema 权限（关键）
GRANT USAGE, CREATE ON SCHEMA public TO con_manage;

-- 针对 public schema 的未来对象赋予权限给 nestjs_boilerplate
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO nestjs_boilerplate;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO nestjs_boilerplate;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO nestjs_boilerplate;

