import { OssSdkError } from './errors';
import { FileUploadProcess } from './file-upload-process';
import { OssFetchClient } from './http-client';
import { S3MultipartUploadAdapter } from './s3-multipart-upload.adapter';
import type {
  FileRecord,
  FileUploadProcessOptions,
  OssWebSdkOptions,
} from './types';

export interface DirectUploadOptions {
  file: File;
  key: string;
  ossConfigCode: string;
  hash?: string;
  meta?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface AccessUrlOptions {
  key: string;
  ossConfigCode: string;
  expiresIn?: number;
  responseContentType?: string;
  responseContentDisposition?: string;
}

export class OssWebSdk {
  readonly client: OssFetchClient;

  constructor(options: OssWebSdkOptions = {}) {
    this.client = new OssFetchClient(options);
  }

  createUploadProcess(
    options: Omit<FileUploadProcessOptions, 'adapter'>,
  ): FileUploadProcess {
    return new FileUploadProcess({
      ...options,
      adapter: new S3MultipartUploadAdapter({ client: this.client }),
    });
  }

  async upload(options: DirectUploadOptions): Promise<FileRecord> {
    const signed = await this.client.post<{
      url: string;
      fullUrl?: string;
    }>(
      this.client.endpoints.signPut,
      {
        ossConfigCode: options.ossConfigCode,
        key: options.key,
        contentType: options.file.type || undefined,
      },
      options.signal,
    );
    const uploadResponse = await this.client.fetch(signed.url, {
      method: 'PUT',
      body: options.file,
      headers: options.file.type
        ? { 'content-type': options.file.type }
        : undefined,
      signal: options.signal,
    });
    if (!uploadResponse.ok) {
      throw new OssSdkError(
        `OSS 文件上传失败: ${uploadResponse.status}`,
        uploadResponse.status,
      );
    }
    return await this.client.post<FileRecord>(
      this.client.endpoints.callback,
      {
        filename: options.file.name,
        suffix: getFileSuffix(options.file.name),
        meta: options.meta,
        object: options.key,
        hash: options.hash,
        ossConfigCode: options.ossConfigCode,
      },
      options.signal,
    );
  }

  async getAccessUrl(options: AccessUrlOptions): Promise<string> {
    const signed = await this.client.post<{ url: string }>(
      this.client.endpoints.signGet,
      options,
    );
    return signed.url;
  }
}

function getFileSuffix(filename: string): string | undefined {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > -1 ? filename.slice(dotIndex + 1) : undefined;
}
