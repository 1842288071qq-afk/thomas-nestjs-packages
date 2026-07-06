-- =============================================================================
-- core_request_log 表 account_id / identity_id 类型迁移
-- 从 VARCHAR(64) 迁移到 BIGINT
--
-- 前置条件: 现有数据中的 account_id 和 identity_id 均为纯数字雪花 ID 字符串，
--           可以直接通过 ::bigint 转换，无需额外清洗。
--
-- 注意: ALTER COLUMN TYPE 会获取 ACCESS EXCLUSIVE 锁，表会短暂不可写。
--       建议在低峰期执行，并在事务内完成。
-- =============================================================================

-- 第一步：执行前预检（可单独在只读库执行，确认数据安全）
-- 检查是否有非数字值（预期返回 0）
-- SELECT COUNT(*) FROM core_request_log WHERE account_id IS NOT NULL AND account_id !~ '^\d+$';
-- SELECT COUNT(*) FROM core_request_log WHERE identity_id IS NOT NULL AND identity_id !~ '^\d+$';

-- 第二步：执行迁移
BEGIN;

-- 2.1 删除依赖这两个列的旧索引
DROP INDEX IF EXISTS idx_core_request_log_account_created_at;
DROP INDEX IF EXISTS idx_core_request_log_identity_created_at;

-- 2.2 转换列类型
ALTER TABLE core_request_log
  ALTER COLUMN account_id TYPE BIGINT USING account_id::bigint;

ALTER TABLE core_request_log
  ALTER COLUMN identity_id TYPE BIGINT USING identity_id::bigint;

-- 2.3 重建索引
CREATE INDEX idx_core_request_log_account_created_at
  ON core_request_log (account_id, created_at DESC);

CREATE INDEX idx_core_request_log_identity_created_at
  ON core_request_log (identity_id, created_at DESC);

COMMIT;

-- 第三步：验证迁移结果
-- 确认列类型已变更
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'core_request_log'
--   AND column_name IN ('account_id', 'identity_id');

-- 确认索引已重建
-- SELECT indexname FROM pg_indexes WHERE tablename = 'core_request_log';