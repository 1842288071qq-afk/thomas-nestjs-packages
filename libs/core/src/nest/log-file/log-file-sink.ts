import { mkdirSync } from 'fs';
import os from 'os';
import path from 'path';
import type { Options } from 'rotating-file-stream';
import type { AppLogFileConfig } from '@thomas/nestjs/common/config/config.interface';

/**
 * 日志文件落盘 sink：对外仅暴露 write/close，内部封装 rotating-file-stream（rfs）。
 * 所有写入都是异步、带缓冲的，不会阻塞请求主流程；落盘异常自动降级，绝不影响业务。
 */
export interface LogFileSink {
  /** 原样写入一段文本（调用方自行决定是否带换行） */
  write(text: string): void;
  /** 优雅关闭，flush 剩余缓冲 */
  close(): Promise<void>;
}

/** 仅保留文件名安全字符，避免主机名/应用名中的特殊字符破坏路径 */
function sanitizeSegment(value: string): string {
  return value.replace(/[^\w.-]+/g, '_');
}

/** 解析活跃文件名模板中的占位符（启动时一次性确定，进程内不变） */
function resolveActiveFileName(template: string, appName: string): string {
  return template
    .replace(/\{app\}/g, sanitizeSegment(appName) || 'app')
    .replace(/\{pid\}/g, String(process.pid))
    .replace(/\{host\}/g, sanitizeSegment(os.hostname()) || 'host');
}

/**
 * 创建一个基于 rfs 的滚动落盘 sink。
 * rfs 在第三方依赖中（webpack externals），此处用动态 import 懒加载——
 * 仅当 file 日志开启时才加载，关闭态零依赖、零开销。
 */
export async function createLogFileSink(
  config: AppLogFileConfig,
  appName: string,
): Promise<LogFileSink> {
  const dir = path.resolve(config.dir);
  // rfs 也会按需建目录，这里提前 ensure，便于尽早暴露权限类错误
  mkdirSync(dir, { recursive: true });

  const fileName = resolveActiveFileName(config.fileName, appName);

  const options: Options = { path: dir };
  if (config.size) {
    options.size = config.size;
  }
  if (config.interval) {
    options.interval = config.interval;
  }
  if (config.maxFiles) {
    options.maxFiles = config.maxFiles;
  }
  if (config.compress) {
    options.compress = 'gzip';
  }

  const { createStream } = await import('rotating-file-stream');
  const stream = createStream(fileName, options);

  let broken = false;
  stream.on('error', (err: unknown) => {
    // 落盘失败不能拖垮业务：标记降级并一次性告警，后续写入静默丢弃
    broken = true;
    process.stderr.write(
      `[log-file] stream error, file logging degraded: ${String(err)}\n`,
    );
  });

  return {
    write(text: string) {
      if (broken || !text) {
        return;
      }
      try {
        stream.write(text);
      } catch {
        // 极端情况下忽略单条写入异常，保证主流程不受影响
      }
    },
    close() {
      return new Promise<void>((resolve) => {
        stream.end(() => resolve());
      });
    },
  };
}
