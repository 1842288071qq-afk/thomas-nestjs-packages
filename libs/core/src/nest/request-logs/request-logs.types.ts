import { Request } from 'express';

export type RequestLogSystemType = 'ykl' | 'khy' | 'yypt' | (string & {});
export type RequestLogsPersistenceMode = 'database' | 'kafka';

export interface RequestLogBodyCaptureOptions {
  requestBody?: boolean;
  responseBody?: boolean;
}

export type RequestLogsRuntimeOptions = RequestLogBodyCaptureOptions;

export interface RequestLogsModuleOptions {
  systemType: RequestLogSystemType;
  enabled?: boolean;
  persistenceMode?: RequestLogsPersistenceMode;
  kafkaTopic?: string;
  includeHeaders?: boolean;
  captureRequestBodyByDefault?: boolean;
  captureResponseBodyByDefault?: boolean;
  maxBodyLength?: number;
  maskedHeaders?: string[];
  ignorePaths?: Array<string | RegExp>;
  skip?: (request: Request) => boolean;
}

export interface RequestLogsResolvedOptions {
  systemType: RequestLogSystemType;
  enabled: boolean;
  persistenceMode: RequestLogsPersistenceMode;
  kafkaTopic: string;
  includeHeaders: boolean;
  captureRequestBodyByDefault: boolean;
  captureResponseBodyByDefault: boolean;
  maxBodyLength: number;
  maskedHeaders: string[];
  ignorePaths: Array<string | RegExp>;
  skip?: (request: Request) => boolean;
}

export interface CreateRequestLogInput {
  systemType: string;
  accountId?: string;
  accountSource?: string;
  identityId?: string;
  requestId?: string;
  method: string;
  requestAt: Date;
  fullPath: string;
  path: string;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  requestBody?: unknown;
  responseBody?: unknown;
  headers?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  costMs: number;
  httpStatus: number;
  bizCode?: number;
  success: boolean;
  errorMessage?: string;
}
