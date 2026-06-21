import type { LogFileSink } from './log-file-sink';

// 终端颜色控制符（ESC[...m），落盘前剥离，保证文件内容干净可检索。
// 用 fromCharCode 构造 ESC，避免正则字面量里出现控制字符触发 no-control-regex。
const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

type WriteStreamLike = NodeJS.WriteStream;

/** process.stdout/stderr.write 的精简签名，覆盖 (chunk, cb) 与 (chunk, encoding, cb) 两种形态 */
type StreamWrite = (
  chunk: string | Uint8Array,
  encoding?: BufferEncoding,
  callback?: (err?: Error | null) => void,
) => boolean;

/** 把任意 write chunk 还原为文本（仅 string / Uint8Array 有效） */
function extractText(chunk: string | Uint8Array): string {
  if (typeof chunk === 'string') {
    return chunk;
  }
  return Buffer.from(chunk).toString('utf8');
}

/**
 * text 模式：把 process.stdout / stderr 的输出「原样镜像」一份到文件 sink。
 * 始终先转发到真实 write，再复制到文件——控制台/`docker logs` 输出保持原样。
 * 返回还原函数，便于优雅关闭时摘除补丁。
 */
export function teeStdStreams(sink: LogFileSink): () => void {
  const restores = [
    patchStream(process.stdout, sink),
    patchStream(process.stderr, sink),
  ];
  return () => restores.forEach((restore) => restore());
}

function patchStream(stream: WriteStreamLike, sink: LogFileSink): () => void {
  const original = stream.write.bind(stream) as unknown as StreamWrite;

  const patched: StreamWrite = (chunk, encoding, callback) => {
    try {
      const text = extractText(chunk);
      if (text) {
        sink.write(text.replace(ANSI_PATTERN, ''));
      }
    } catch {
      // 镜像失败不影响真实输出
    }
    return original(chunk, encoding, callback);
  };

  stream.write = patched as WriteStreamLike['write'];
  return () => {
    stream.write = original as WriteStreamLike['write'];
  };
}

/**
 * json 模式可选安全网：捕获结构化 Logger 看不到的进程级崩溃输出
 * （uncaughtException / unhandledRejection），写入同一文件 sink。
 *
 * - 使用 `uncaughtExceptionMonitor`：仅监听、不吞异常，进程默认崩溃语义不变。
 * - unhandledRejection 记录后重新抛出，保留 Node 默认终止行为。
 * 返回卸载函数。
 */
export function installCrashCapture(
  sink: LogFileSink,
  appName: string,
): () => void {
  const writeRecord = (context: string, err: unknown) => {
    try {
      const error = err instanceof Error ? err : undefined;
      sink.write(
        `${JSON.stringify({
          ts: new Date().toISOString(),
          level: 'fatal',
          app: appName,
          pid: process.pid,
          context,
          msg: error ? error.message : String(err),
          trace: error?.stack,
        })}\n`,
      );
    } catch {
      // 崩溃记录失败时无能为力，保持静默
    }
  };

  const onUncaught = (err: unknown) => writeRecord('uncaughtException', err);
  const onRejection = (reason: unknown) => {
    writeRecord('unhandledRejection', reason);
    // 记录后重新抛出，交回 Node 默认（崩溃）语义
    throw reason;
  };

  process.on('uncaughtExceptionMonitor', onUncaught);
  process.on('unhandledRejection', onRejection);

  return () => {
    process.off('uncaughtExceptionMonitor', onUncaught);
    process.off('unhandledRejection', onRejection);
  };
}
