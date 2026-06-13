import type { LogLevel } from '@nestjs/common';

export type AppLoggerLevel =
  | 'fatal'
  | 'error'
  | 'warn'
  | 'info'
  | 'debug'
  | 'verbose';

export interface AppLoggerConfig {
  /** 日志最小输出级别，默认 info */
  level: AppLoggerLevel;
  /** Nest 实际启用的日志级别列表 */
  levels: LogLevel[];
  /** 启动日志上下文，默认取 APP_NAME */
  context: string;
}

export interface AppRequestLogsConfig {
  /** 是否持久化 HTTP 请求日志，默认 false */
  persistEnabled: boolean;
  /** 是否将请求日志打印到 stdout，默认 false */
  printToStdout: boolean;
}

export interface AppConfig {
  port: number;
  name: string;
  devName: string;
  apiPrefix: string;
  host?: string;
  logger: AppLoggerConfig;
  requestLogs: AppRequestLogsConfig;
}

export interface SessionConfig {
  maxTime: number;
  debounceTime: number;
  kickOutEnable: boolean;
}
export interface QuestionBankConfig {
  baseUrl: string;
  defaultAgentId: string;
  sessionKey: string;
}

export interface FileConfig {
  local: {
    storageRoot: string;
    serveRoot: string;
  };
}

export interface DataSourceConfig {
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  autoLoadEntities: boolean;
  synchronize: boolean;
  logging: boolean;
  namingStrategy: any;
  name?: string;
}

declare global {
  interface AllConfig {
    app: AppConfig;
    session: SessionConfig;
    datasource: Record<string, DataSourceConfig>;
    questionBank: QuestionBankConfig;
    file: FileConfig;
  }
}
