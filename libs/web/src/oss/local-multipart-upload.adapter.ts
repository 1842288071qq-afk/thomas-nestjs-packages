import { OssFetchClient } from './http-client';
import { createContentMd5 } from './md5';
import type {
  FileRecord,
  LocalWebSdkEndpoints,
  MultipartCompleteResult,
  MultipartInitializeInput,
  MultipartUploadAdapter,
  MultipartUploadPartInput,
  MultipartUploadSession,
  UploadedPart,
} from './types';

interface LocalMultipartInitResponse {
  upload: { uploadId: string; key: string };
  file: FileRecord & { uploadId: string };
  chunkSize: number;
  parts: UploadedPart[];
}

export class LocalMultipartUploadAdapter implements MultipartUploadAdapter {
  constructor(
    private readonly client: OssFetchClient,
    private readonly endpoints: LocalWebSdkEndpoints,
  ) {}

  async initialize(
    input: MultipartInitializeInput,
  ): Promise<MultipartUploadSession> {
    const result = await this.client.post<LocalMultipartInitResponse>(
      this.endpoints.multipartInit,
      {
        key: input.key,
        hash: input.hash,
        filename: input.file.name,
        mimeType: input.file.type || undefined,
        suffix: getFileSuffix(input.file.name),
        size: `${input.file.size}`,
        chunkSize: input.chunkSize,
        meta: input.meta,
      },
      input.signal,
    );
    return {
      fileId: result.file.id,
      uploadId: result.upload.uploadId,
      key: result.upload.key,
      ossConfigCode: input.ossConfigCode,
      chunkSize: result.chunkSize,
      uploadedParts: result.parts,
    };
  }

  async uploadPart(input: MultipartUploadPartInput): Promise<UploadedPart> {
    const checksum =
      input.checksum?.value ??
      (await createContentMd5(input.body, input.signal));
    const body = new FormData();
    body.append('fileId', input.session.fileId);
    body.append('partNumber', `${input.partNumber}`);
    body.append('contentMd5', checksum);
    body.append('file', input.body, `part-${input.partNumber}`);
    return await this.client.postForm<UploadedPart>(
      this.endpoints.multipartPart,
      body,
      input.signal,
    );
  }

  async complete(
    session: MultipartUploadSession,
  ): Promise<MultipartCompleteResult> {
    return await this.client.post<MultipartCompleteResult>(
      this.endpoints.multipartComplete,
      { fileId: session.fileId },
    );
  }

  async abort(session: MultipartUploadSession): Promise<void> {
    await this.client.post<FileRecord>(this.endpoints.multipartAbort, {
      fileId: session.fileId,
    });
  }
}

function getFileSuffix(filename: string): string | undefined {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > -1 ? filename.slice(dotIndex + 1) : undefined;
}
