import { FileUploadProcess } from './file-upload-process';
import { OssWebSdk } from './oss-web-sdk';
import type { MultipartUploadAdapter, MultipartUploadSession } from './types';

describe('FileUploadProcess 自动选择上传模式', () => {
  it('小于阈值时使用普通直传', async () => {
    const adapter = createAdapter();
    const directUpload = jest.fn().mockResolvedValue({
      id: 'direct-file',
      object: 'small.bin',
    });
    const process = new FileUploadProcess({
      file: createFile(9),
      key: 'small.bin',
      ossConfigCode: 'oss',
      adapter,
      directUpload,
      multipartThreshold: 10,
    });

    expect(process.mode).toBe('direct');
    await expect(process.start()).resolves.toEqual(
      expect.objectContaining({ id: 'direct-file' }),
    );
    expect(directUpload).toHaveBeenCalledTimes(1);
    expect(adapter.initialize.mock.calls).toHaveLength(0);
  });

  it('达到阈值时使用分片上传', async () => {
    const adapter = createAdapter(5);
    const directUpload = jest.fn();
    const process = new FileUploadProcess({
      file: createFile(10),
      key: 'large.bin',
      ossConfigCode: 'oss',
      adapter,
      directUpload,
      multipartThreshold: 10,
    });

    expect(process.mode).toBe('multipart');
    await process.start();
    expect(adapter.initialize.mock.calls).toHaveLength(1);
    expect(adapter.uploadPart.mock.calls).toHaveLength(2);
    expect(directUpload).not.toHaveBeenCalled();
  });

  it('支持强制指定上传模式', () => {
    const adapter = createAdapter();
    const directUpload = jest.fn();
    const forcedDirect = new FileUploadProcess({
      file: createFile(100),
      key: 'forced-direct.bin',
      ossConfigCode: 'oss',
      adapter,
      directUpload,
      uploadMode: 'direct',
    });
    const forcedMultipart = new FileUploadProcess({
      file: createFile(1),
      key: 'forced-multipart.bin',
      ossConfigCode: 'oss',
      adapter,
      directUpload,
      uploadMode: 'multipart',
    });

    expect(forcedDirect.mode).toBe('direct');
    expect(forcedMultipart.mode).toBe('multipart');
  });

  it('单次阈值配置优先于 SDK 全局配置', () => {
    const sdk = new OssWebSdk({ multipartThreshold: 100 });
    const globalProcess = sdk.createUploadProcess({
      file: createFile(50),
      key: 'global.bin',
      ossConfigCode: 'oss',
    });
    const overriddenProcess = sdk.createUploadProcess({
      file: createFile(50),
      key: 'override.bin',
      ossConfigCode: 'oss',
      multipartThreshold: 10,
    });

    expect(globalProcess.mode).toBe('direct');
    expect(overriddenProcess.mode).toBe('multipart');
  });

  it('直传暂停后会在恢复时从头重传', async () => {
    let attempt = 0;
    const directUpload = jest.fn(
      (signal: AbortSignal) =>
        new Promise<{ id: string; object: string }>((resolve, reject) => {
          attempt += 1;
          if (attempt === 1) {
            signal.addEventListener(
              'abort',
              () =>
                reject(
                  signal.reason instanceof Error
                    ? signal.reason
                    : new Error('上传已暂停'),
                ),
              { once: true },
            );
            return;
          }
          resolve({ id: 'direct-file', object: 'paused.bin' });
        }),
    );
    const process = new FileUploadProcess({
      file: createFile(9),
      key: 'paused.bin',
      ossConfigCode: 'oss',
      adapter: createAdapter(),
      directUpload,
      multipartThreshold: 10,
    });

    const started = process.start();
    while (directUpload.mock.calls.length === 0) await Promise.resolve();
    process.pause();
    expect(process.state).toBe('paused');
    await expect(process.resume()).resolves.toEqual(
      expect.objectContaining({ id: 'direct-file' }),
    );
    await expect(started).resolves.toEqual(
      expect.objectContaining({ id: 'direct-file' }),
    );
    expect(directUpload).toHaveBeenCalledTimes(2);
  });

  it('拒绝非法分片阈值', () => {
    expect(
      () =>
        new FileUploadProcess({
          file: createFile(1),
          key: 'invalid.bin',
          ossConfigCode: 'oss',
          adapter: createAdapter(),
          directUpload: jest.fn(),
          multipartThreshold: 0,
        }),
    ).toThrow('multipartThreshold 必须为正整数');
  });
});

function createFile(size: number): File {
  return new File([new Uint8Array(size)], 'file.bin', {
    type: 'application/octet-stream',
    lastModified: 1_700_000_000_000,
  });
}

function createAdapter(chunkSize = 5): jest.Mocked<MultipartUploadAdapter> {
  const session: MultipartUploadSession = {
    fileId: 'multipart-file',
    uploadId: 'upload-1',
    key: 'large.bin',
    ossConfigCode: 'oss',
    chunkSize,
    uploadedParts: [],
  };
  return {
    initialize: jest.fn().mockResolvedValue(session),
    uploadPart: jest.fn(({ partNumber, body }) =>
      Promise.resolve({
        partNumber,
        eTag: `etag-${partNumber}`,
        size: body.size,
      }),
    ),
    complete: jest.fn().mockResolvedValue({
      id: 'multipart-file',
      object: 'large.bin',
    }),
    abort: jest.fn().mockResolvedValue(undefined),
  };
}
