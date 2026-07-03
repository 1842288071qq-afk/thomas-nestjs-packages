import Snowflakify, {
  TimestampFragment,
  WorkerFragment,
  ProcessFragment,
  SequenceFragment,
} from 'snowflakify';

/**
 * 自定义纪元（2023-01-01），必须与历史 ID 保持一致，切勿改动。
 */
const EPOCH = 1672531200000;

/**
 * WorkerFragment 占 5 bit，取值范围 0..31。
 * 多进程 / 多容器部署（如 client 主备实例、admin、monitor）时，每个进程必须分配
 * 唯一的 worker id，否则默认预设下 WorkerFragment 恒为 0、ProcessFragment 仅取
 * pid 低位（容器独立 PID namespace 下常常相同），会导致雪花 ID 跨进程主键冲突。
 */
const WORKER_ID_BITS = 5;
const MAX_WORKER_ID = (1 << WORKER_ID_BITS) - 1;

/**
 * 解析进程唯一的 worker id，来源为环境变量 SNOWFLAKE_WORKER_ID。
 * 非法或越界时回退 0 并打印警告，避免误配导致进程启动崩溃。
 */
function resolveWorkerId(): number {
  const raw = process.env.SNOWFLAKE_WORKER_ID;
  if (raw === undefined || raw.trim() === '') return 0;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_WORKER_ID) {
    console.warn(
      `[snowflake] invalid SNOWFLAKE_WORKER_ID="${raw}" (expected integer 0..${MAX_WORKER_ID}), fallback to 0`,
    );
    return 0;
  }
  return parsed;
}

/**
 * 当前进程解析到的 worker id，供需要感知实例编号的场景复用。
 */
export const snowflakeWorkerId = resolveWorkerId();

export const snowflakeIdGenerator = new Snowflakify({
  fragmentArray: [
    new TimestampFragment(42, EPOCH),
    // 显式注入 worker id 区分不同进程；ProcessFragment 保留 pid 低位作额外熵。
    new WorkerFragment(WORKER_ID_BITS, snowflakeWorkerId),
    new ProcessFragment(5),
    new SequenceFragment(12),
  ],
});
