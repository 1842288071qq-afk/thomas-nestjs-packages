import type { INestApplication } from '@nestjs/common';
import type { AppConfig } from '@qyy-code-lego/nestjs/common/config/config.interface';
import { createLogFileSink, type LogFileSink } from './log-file-sink';
import { FileLogger } from './file-logger';
import { installCrashCapture, teeStdStreams } from './std-capture';

/** 关闭/卸载文件日志的回调（摘除补丁、flush 并关闭 sink） */
export type LogFileTeardown = () => Promise<void> | void;

/**
 * 应用日志统一安装入口，替代各 app main.ts 里的 `app.useLogger(appConfig.logger.levels)`。
 *
 * 行为完全由 env（APP_LOG_FILE_*）驱动：
 * - 关闭（默认）：等价于原 `app.useLogger(levels)`，对 std 输出零侵入，开发态保持原样。
 * - 开启 + json：注入结构化 FileLogger，控制台原样输出 + 逐行 JSON 落盘滚动文件；
 *   captureStd 时附带进程级崩溃安全网。
 * - 开启 + text：保持默认 Console 输出，并把 std 原样镜像到滚动文件。
 *
 * 落盘初始化失败时自动降级为「仅控制台」，绝不阻断启动。
 */
export async function setupAppLogger(
  app: INestApplication,
  appConfig: AppConfig,
): Promise<LogFileTeardown> {
  const { logger, logFile, name } = appConfig;

  if (!logFile.enabled) {
    app.useLogger(logger.levels);
    return () => {};
  }

  let sink: LogFileSink;
  try {
    sink = await createLogFileSink(logFile, name);
  } catch (err) {
    process.stderr.write(
      `[log-file] init failed, fallback to console only: ${String(err)}\n`,
    );
    app.useLogger(logger.levels);
    return () => {};
  }

  if (logFile.format === 'json') {
    app.useLogger(new FileLogger(logger.context, logger.levels, sink, name));
    const teardownCrash = logFile.captureStd
      ? installCrashCapture(sink, name)
      : () => {};
    return async () => {
      teardownCrash();
      await sink.close();
    };
  }

  // text 模式：沿用默认 Console 输出，再把 std 原样镜像到文件
  app.useLogger(logger.levels);
  const restoreTee = teeStdStreams(sink);
  return async () => {
    restoreTee();
    await sink.close();
  };
}
