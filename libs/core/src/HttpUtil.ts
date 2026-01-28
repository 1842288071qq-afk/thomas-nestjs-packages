export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface HttpRequestOptions {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
  body?: Record<string, unknown>;
  /**
   * 强制解析为 JSON，忽略 Content-Type。
   * 某些旧平台接口可能返回 test/html 但内容实际是 JSON。
   */
  forceJSON?: boolean;
}

export type HttpResponse<T> = [T | null, Error | null];

export class HttpUtil {
  /**
   * 发起请求
   * @param options 请求配置
   * @returns [数据, 错误] 元组
   */
  static async request<T = Record<string, unknown>>(
    options: HttpRequestOptions,
  ): Promise<HttpResponse<T>> {
    const { url, method = 'GET', headers = {}, params = {}, body } = options;

    const query = new URLSearchParams(
      Object.entries(params).reduce(
        (acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        },
        {} as Record<string, string>,
      ),
    ).toString();

    const fullUrl = `${url}${query ? `${url.includes('?') ? '&' : '?'}${query}` : ''}`;

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        return [
          null,
          new Error(`HTTP Error: ${response.status} ${response.statusText}`),
        ];
      }

      // 如果强制 JSON，则直接尝试解析
      if (options.forceJSON) {
        try {
          const data = (await response.json()) as T;
          return [data, null];
        } catch (e) {
          return [
            null,
            new Error(
              `Force JSON parsing failed: ${e instanceof Error ? e.message : String(e)}`,
            ),
          ];
        }
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = (await response.json()) as T;
        return [data, null];
      }

      // 非JSON返回，或者没有Content-Type，也当作成功，但可能没有data
      const text = await response.text();
      return [text as unknown as T, null];
    } catch (error) {
      return [null, error instanceof Error ? error : new Error(String(error))];
    }
  }
}
