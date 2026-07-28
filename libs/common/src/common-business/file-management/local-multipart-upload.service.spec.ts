import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { ConfigService } from '@nestjs/config';
import type { FileService } from '@qyy-code-lego/nestjs/core/nest/file-management/file.service';
import { IdentityType } from '@qyy-code-lego/nestjs/entities/core/identity/constants';
import { SysFileEntity } from '@qyy-code-lego/nestjs/entities/core/sys/sys-file.entity';
import fs from 'fs-extra';
import { LocalMultipartUploadService } from './local-multipart-upload.service';

describe('LocalMultipartUploadService', () => {
  const storageRoot = path.join(
    process.cwd(),
    '.tmp-test',
    `local-multipart-${randomUUID()}`,
  );
  let currentFile: SysFileEntity | null;
  let service: LocalMultipartUploadService;

  beforeEach(() => {
    currentFile = null;
    const config = {
      get: jest.fn((key: string, defaultValue: unknown) => {
        const values: Record<string, unknown> = {
          'file.local.storageRoot': storageRoot,
          'file.local.serveRoot': '/files',
          'file.local.multipartChunkSize': 4,
        };
        return values[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;
    const fileService = {
      findLocalByObject: jest.fn(() => Promise.resolve(currentFile)),
      createLocalUploadTask: jest.fn((payload: Partial<SysFileEntity>) => {
        currentFile = Object.assign(new SysFileEntity(), payload, {
          id: 'file-1',
          createdBy: 'user-1',
        });
        return Promise.resolve(currentFile);
      }),
      findById: jest.fn(() => Promise.resolve(currentFile)),
      save: jest.fn((file: SysFileEntity) => {
        currentFile = file;
        return Promise.resolve(file);
      }),
    } as unknown as FileService;
    service = new LocalMultipartUploadService(config, fileService);
  });

  afterAll(async () => {
    await fs.remove(storageRoot);
  });

  it('支持初始化、识别已上传分片、合并并清理临时目录', async () => {
    const actor = {
      identityType: IdentityType.User,
      identityId: 'user-1',
    };
    const input = {
      key: 'admin-test/demo.txt',
      hash: 'fingerprint-1',
      filename: 'demo.txt',
      mimeType: 'text/plain',
      size: '6',
      chunkSize: 4,
    };
    const initialized = await service.initMultipart(input, actor);
    expect(initialized.parts).toEqual([]);

    const first = Buffer.from('abcd');
    await service.uploadPart(
      {
        fileId: 'file-1',
        partNumber: 1,
        contentMd5: md5(first),
        file: multerFile(first),
      },
      actor,
    );
    await expect(service.initMultipart(input, actor)).resolves.toMatchObject({
      parts: [{ partNumber: 1, size: 4 }],
    });

    const second = Buffer.from('ef');
    await service.uploadPart(
      {
        fileId: 'file-1',
        partNumber: 2,
        contentMd5: md5(second),
        file: multerFile(second),
      },
      actor,
    );
    const completed = await service.completeMultipart(
      { fileId: 'file-1' },
      actor,
    );

    await expect(
      fs.readFile(path.join(storageRoot, 'admin-test/demo.txt'), 'utf8'),
    ).resolves.toBe('abcdef');
    expect(completed).toMatchObject({
      completed: true,
      uploadId: null,
      fullUrl: '/files/admin-test/demo.txt',
    });
    await expect(
      fs.pathExists(path.join(storageRoot, '.multipart', 'file-1')),
    ).resolves.toBe(false);
  });

  it('拒绝 MD5 不匹配的本地分片', async () => {
    const actor = {
      identityType: IdentityType.User,
      identityId: 'user-1',
    };
    await service.initMultipart(
      {
        key: 'admin-test/demo.txt',
        hash: 'fingerprint-1',
        filename: 'demo.txt',
        size: '4',
      },
      actor,
    );
    await expect(
      service.uploadPart(
        {
          fileId: 'file-1',
          partNumber: 1,
          contentMd5: md5(Buffer.from('nope')),
          file: multerFile(Buffer.from('data')),
        },
        actor,
      ),
    ).rejects.toThrow('本地分片 MD5 校验失败');
  });
});

function md5(value: Buffer): string {
  return createHash('md5').update(value).digest('base64');
}

function multerFile(buffer: Buffer): Express.Multer.File {
  return {
    buffer,
    size: buffer.length,
    fieldname: 'file',
    originalname: 'part',
    encoding: '7bit',
    mimetype: 'application/octet-stream',
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
  };
}
