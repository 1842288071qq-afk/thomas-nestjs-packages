import { RequestLogsRuntimeOptions } from './request-logs.types';

declare global {
  interface ThreadLocalStore {
    requestLogs?: RequestLogsRuntimeOptions;
  }
}

export {};
