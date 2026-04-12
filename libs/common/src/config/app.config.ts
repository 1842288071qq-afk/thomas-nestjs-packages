import { registerAs } from '@nestjs/config';
import type { LogLevel } from '@nestjs/common';
import os from 'os';
import type {
  AppConfig,
  AppLoggerConfig,
  AppLoggerLevel,
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

export default registerAs('app', (): AppConfig => {
  const host = process.env.APP_HOST?.trim();

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    // 其他扩展树形
    apiPrefix: process.env.API_PREFIX || '',
    name: process.env.APP_NAME || 'nest-app',
    // 默认devName为系统机器名称
    devName: process.env.DEV_NAME || os.hostname(),
    host: host || undefined,
    logger: resolveAppLoggerConfig(),
  };
});
