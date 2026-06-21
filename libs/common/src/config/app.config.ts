import { registerAs } from '@nestjs/config';
import type { LogLevel } from '@nestjs/common';
import os from 'os';
import type {
  AppConfig,
  AppLogFileConfig,
  AppLogFileFormat,
  AppLoggerConfig,
  AppLoggerLevel,
  AppRequestLogsConfig,
} from './config.interface';

const APP_LOG_LEVELS_MAP: Record<AppLoggerLevel, LogLevel[]> = {
  fatal: ['fatal'],
  error: ['fatal', 'error'],
  warn: ['fatal', 'error', 'warn'],
  info: ['fatal', 'error', 'warn', 'log'],
  debug: ['fatal', 'error', 'warn', 'log', 'debug'],
  verbose: ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'],
};

function isAppLoggerLevel(value: string): value is AppLoggerLevel {
  return value in APP_LOG_LEVELS_MAP;
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }

  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

export function resolveAppLoggerConfig(
  env: NodeJS.ProcessEnv = process.env,
): AppLoggerConfig {
  const rawLevel = env.APP_LOG_LEVEL?.trim().toLowerCase() || 'info';
  const level = isAppLoggerLevel(rawLevel) ? rawLevel : 'info';
  const appName = env.APP_NAME?.trim() || 'nest-app';
  const context = env.APP_LOGGER_CONTEXT?.trim() || appName;

  return {
    level,
    levels: APP_LOG_LEVELS_MAP[level],
    context,
  };
}

export function resolveAppRequestLogsConfig(
  env: NodeJS.ProcessEnv = process.env,
): AppRequestLogsConfig {
  const accessLogEnabled = parseBooleanEnv(
    env.APP_REQUEST_LOGS_ACCESS_LOG_ENABLED ??
      env.APP_REQUEST_LOGS_PRINT_TO_STDOUT,
    false,
  );

  return {
    persistEnabled: parseBooleanEnv(
      env.APP_REQUEST_LOGS_PERSIST_ENABLED ?? env.APP_REQUEST_LOGS_ENABLED,
      false,
    ),
    accessLogEnabled,
    printToStdout: accessLogEnabled,
  };
}

function parseOptionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }
  const parsed = parseInt(normalized, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function resolveAppLogFileConfig(
  env: NodeJS.ProcessEnv = process.env,
): AppLogFileConfig {
  const rawFormat = env.APP_LOG_FILE_FORMAT?.trim().toLowerCase();
  const format: AppLogFileFormat = rawFormat === 'text' ? 'text' : 'json';

  return {
    enabled: parseBooleanEnv(env.APP_LOG_FILE_ENABLED, false),
    format,
    dir: parseOptionalString(env.APP_LOG_FILE_DIR) ?? './logs',
    fileName: parseOptionalString(env.APP_LOG_FILE_NAME) ?? '{app}.log',
    size: parseOptionalString(env.APP_LOG_FILE_MAX_SIZE) ?? '20M',
    interval: parseOptionalString(env.APP_LOG_FILE_INTERVAL) ?? '1d',
    maxFiles: parsePositiveInt(env.APP_LOG_FILE_MAX_FILES) ?? 14,
    compress: parseBooleanEnv(env.APP_LOG_FILE_COMPRESS, true),
    captureStd: parseBooleanEnv(env.APP_LOG_FILE_CAPTURE_STD, false),
  };
}

export default registerAs('app', (): AppConfig => {
  const host = process.env.HOST?.trim();

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    // 其他扩展树形
    apiPrefix: process.env.API_PREFIX || '',
    name: process.env.APP_NAME || 'nest-app',
    // 默认devName为系统机器名称
    devName: process.env.DEV_NAME || os.hostname(),
    // 不配置时保持 Nest 默认监听行为（不显式传 host）
    host: host || undefined,
    logger: resolveAppLoggerConfig(),
    requestLogs: resolveAppRequestLogsConfig(),
    logFile: resolveAppLogFileConfig(),
  };
});
