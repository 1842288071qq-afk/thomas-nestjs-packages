export interface AppConfig {
  port: number;
  name: string;
  devName: string;
  apiPrefix: string;
  host?: string;
  sessionKickOutEnable: boolean;
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
    datasource: Record<string, DataSourceConfig>;
    questionBank: QuestionBankConfig;
    file: FileConfig;
  }
}
