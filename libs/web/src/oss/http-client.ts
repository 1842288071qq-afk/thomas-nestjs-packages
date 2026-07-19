import { OssSdkError } from './errors';
import type {
  ApiResBody,
  OssWebSdkEndpoints,
  OssWebSdkOptions,
  RequestHeadersFactory,
} from './types';

export const DEFAULT_OSS_ENDPOINTS: OssWebSdkEndpoints = {
  signPut: '/files/oss/sign/put',
  signGet: '/files/oss/sign/get',
  callback: '/files/oss/callback',
  multipartInit: '/files/oss/multipart/init',
  multipartSignPart: '/files/oss/multipart/sign-part',
  multipartComplete: '/files/oss/multipart/complete',
  multipartAbort: '/files/oss/multipart/abort',
};

export class OssFetchClient {
  readonly endpoints: OssWebSdkEndpoints;
  readonly fetch: typeof fetch;
  private readonly baseUrl: string;
  private readonly headers?: HeadersInit | RequestHeadersFactory;

  constructor(options: OssWebSdkOptions = {}) {
    this.fetch =
      options.fetch ??
      (async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => await window.fetch(input, init));
    this.baseUrl = options.baseUrl?.replace(/\/$/, '') ?? '';
    this.headers = options.headers;
    this.endpoints = { ...DEFAULT_OSS_ENDPOINTS, ...options.endpoints };
  }

  async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const dynamicHeaders =
      typeof this.headers === 'function' ? await this.headers() : this.headers;
    const headers = new Headers(dynamicHeaders);
    headers.set('content-type', 'application/json');
    return await this.request<T>(path, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  }

  async postForm<T>(
    path: string,
    body: FormData,
    signal?: AbortSignal,
  ): Promise<T> {
    const dynamicHeaders =
      typeof this.headers === 'function' ? await this.headers() : this.headers;
    return await this.request<T>(path, {
      method: 'POST',
      headers: new Headers(dynamicHeaders),
      body,
      signal,
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetch(`${this.baseUrl}${path}`, init);

    let payload: ApiResBody<T>;
    try {
      payload = (await response.json()) as ApiResBody<T>;
    } catch (error) {
      throw new OssSdkError(
        `文件接口响应不是有效 JSON: ${response.status}`,
        response.status,
        error,
      );
    }
    if (!response.ok || payload.code < 200 || payload.code >= 300) {
      throw new OssSdkError(
        payload.message || `文件接口请求失败: ${response.status}`,
        payload.code || response.status,
      );
    }
    return payload.data;
  }
}
