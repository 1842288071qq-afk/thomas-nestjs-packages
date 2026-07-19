import { FileService } from '@thomas/nestjs/core/nest/file-management/file.service';
import { S3StorageService } from '@thomas/nestjs/core/nest/s3-storage';
import { IdentityType } from '@thomas/nestjs/entities/core/identity/constants';
import { SysFileEntity } from '@thomas/nestjs/entities/core/sys/sys-file.entity';
import { MultipartUploadService } from './multipart-upload.service';

describe('MultipartUploadService', () => {
  const actor = {
    identityType: IdentityType.User,
    identityId: 'user-1',
  };
  let fileService: {
    findOssByObject: jest.Mock;
    findById: jest.Mock;
    createOssUploadTask: jest.Mock;
    save: jest.Mock;
  };
  let storageService: {
    resolveMultipartChunkSize: jest.Mock;
    initMultipartUpload: jest.Mock;
    generatePresignedPutUrl: jest.Mock;
    generatePresignedUploadPartUrl: jest.Mock;
    listUploadParts: jest.Mock;
    completeMultipartUpload: jest.Mock;
    getObjectMetadata: jest.Mock;
    abortMultipartUpload: jest.Mock;
  };
  let service: MultipartUploadService;

  beforeEach(() => {
    fileService = {
      findOssByObject: jest.fn(),
      findById: jest.fn(),
      createOssUploadTask: jest.fn(),
      save: jest.fn((file: SysFileEntity) => Promise.resolve(file)),
    };
    storageService = {
      resolveMultipartChunkSize: jest.fn(),
      initMultipartUpload: jest.fn(),
      generatePresignedPutUrl: jest.fn(),
      generatePresignedUploadPartUrl: jest.fn(),
      listUploadParts: jest.fn(),
      completeMultipartUpload: jest.fn(),
      getObjectMetadata: jest.fn(),
      abortMultipartUpload: jest.fn(),
    };
    service = new MultipartUploadService(
      fileService as unknown as FileService,
      storageService as unknown as S3StorageService,
    );
  });

  it('拒绝用相同 OSS key 初始化另一个文件', async () => {
    fileService.findOssByObject.mockResolvedValue(
      createFile({ hash: 'old-hash', completed: false }),
    );

    await expect(
      service.initMultipart(
        {
          ossConfigCode: 'oss',
          key: 'videos/same.mp4',
          hash: 'new-hash',
          filename: 'same.mp4',
          size: '10485760',
        },
        actor,
      ),
    ).rejects.toThrow('该 OSS key 已被另一个文件的上传任务占用');
  });

  it('同一普通直传任务已完成时幂等返回文件记录', async () => {
    const file = createFile({
      hash: 'md5:hash',
      size: '10',
      completed: true,
    });
    fileService.findOssByObject.mockResolvedValue(file);

    await expect(
      service.prepareDirectUpload(
        {
          ossConfigCode: 'oss',
          key: file.object,
          filename: file.filename,
          hash: 'md5:hash',
          size: '10',
          contentMd5: '1B2M2Y8AsgTpgAmY7PhCfg==',
        },
        actor,
      ),
    ).resolves.toEqual({ file, completed: true });
    expect(storageService.generatePresignedPutUrl).not.toHaveBeenCalled();
  });

  it('分片签名只使用 fileId 对应的服务端任务信息', async () => {
    const file = createFile({
      size: '6291456',
      chunkSize: 5 * 1024 * 1024,
    });
    fileService.findById.mockResolvedValue(file);
    storageService.generatePresignedUploadPartUrl.mockResolvedValue({
      url: 'signed-url',
    });

    await service.signMultipartPart(
      {
        fileId: file.id,
        partNumber: 2,
        contentLength: 1024 * 1024,
        contentMd5: '1B2M2Y8AsgTpgAmY7PhCfg==',
      },
      actor,
    );

    expect(storageService.generatePresignedUploadPartUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        ossConfigCode: 'oss',
        key: 'videos/file.mp4',
        uploadId: 'upload-1',
        partNumber: 2,
        contentLength: 1024 * 1024,
      }),
    );
  });

  it('分片不完整时拒绝完成上传', async () => {
    const file = createFile({
      size: `${10 * 1024 * 1024}`,
      chunkSize: 5 * 1024 * 1024,
    });
    fileService.findById.mockResolvedValue(file);
    storageService.listUploadParts.mockResolvedValue({
      parts: [
        {
          partNumber: 1,
          eTag: 'etag-1',
          size: 5 * 1024 * 1024,
        },
      ],
      isTruncated: false,
    });

    await expect(
      service.completeMultipart({ fileId: file.id }, actor),
    ).rejects.toThrow('分片数量不完整');
    expect(storageService.completeMultipartUpload).not.toHaveBeenCalled();
  });
});

function createFile(overrides: Partial<SysFileEntity>): SysFileEntity {
  return Object.assign(new SysFileEntity(), {
    id: 'file-1',
    filename: 'file.mp4',
    object: 'videos/file.mp4',
    hash: 'hash-1',
    meta: {},
    storageType: 'oss',
    ossConfigCode: 'oss',
    uploadId: 'upload-1',
    chunkSize: 5 * 1024 * 1024,
    completed: false,
    size: '6291456',
    createdBy: 'user-1',
    ...overrides,
  });
}
