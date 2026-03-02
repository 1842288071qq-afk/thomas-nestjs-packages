import { Injectable } from '@nestjs/common';
import { ThreadLocal } from '../als/thread-local';
import { RequestLogsRuntimeOptions } from './request-logs.types';

@Injectable()
export class RequestLogsControlService {
  constructor(private readonly threadLocal: ThreadLocal) {}

  enableRequestBodyCapture() {
    this.patchRuntimeOptions({ requestBody: true });
  }

  enableResponseBodyCapture() {
    this.patchRuntimeOptions({ responseBody: true });
  }

  enableBodyCapture() {
    this.patchRuntimeOptions({ requestBody: true, responseBody: true });
  }

  disableBodyCapture() {
    this.patchRuntimeOptions({ requestBody: false, responseBody: false });
  }

  setRuntimeOptions(options: RequestLogsRuntimeOptions) {
    this.patchRuntimeOptions(options);
  }

  getRuntimeOptions(): RequestLogsRuntimeOptions | undefined {
    return this.threadLocal.get('requestLogs');
  }

  private patchRuntimeOptions(options: RequestLogsRuntimeOptions) {
    const current = this.threadLocal.get('requestLogs') ?? {};
    this.threadLocal.set('requestLogs', {
      ...current,
      ...options,
    });
  }
}
