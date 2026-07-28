import { S3Client } from '@aws-sdk/client-s3';
import type { OssConfigService } from '../file-management/oss-config.service';
import {
  OssAddressingStyle,
  OssProvider,
} from '@qyy-code-lego/nestjs/entities/core/sys/oss-s3-config.interface';
import { SysOssConfigEntity } from '@qyy-code-lego/nestjs/entities/core/sys/sys-oss-config.entity';
import { S3StorageService } from './s3-storage.service';

describe('S3StorageService 内外网端点隔离', () => {
  it('服务端请求走内网，但浏览器预签名 URL 保持公网', async () => {
    const entity = Object.assign(new SysOssConfigEntity(), {
      code: 'aliyun_internal',
      name: '阿里云内网',
      bucket: 'demo-bucket',
      endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
      internalEndpoint: 'https://oss-cn-hangzhou-internal.aliyuncs.com',
      useInternalEndpoint: true,
      config: {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
        region: 'cn-hangzhou',
        provider: OssProvider.ALIYUN,
        addressingStyle: OssAddressingStyle.VIRTUAL_HOSTED,
      },
    });
    const ossConfigService = {
      findByCode: jest.fn(() => Promise.resolve(entity)),
    } as unknown as OssConfigService;
    const service = new S3StorageService(ossConfigService);

    const context = await (
      service as unknown as {
        getClientContext(code: string): Promise<{
          client: S3Client;
          signingClient: S3Client;
        }>;
      }
    ).getClientContext(entity.code);
    const endpointProvider = context.client.config
      .endpoint as unknown as () => Promise<{ hostname: string }>;
    const serverEndpoint = await endpointProvider();
    const signed = await service.generatePresignedPutUrl({
      ossConfigCode: entity.code,
      key: 'demo/input.mp4',
    });

    expect(serverEndpoint.hostname).toBe(
      'oss-cn-hangzhou-internal.aliyuncs.com',
    );
    expect(new URL(signed.url).hostname).toBe(
      'demo-bucket.oss-cn-hangzhou.aliyuncs.com',
    );
    expect(await context.client.config.requestChecksumCalculation()).toBe(
      'WHEN_REQUIRED',
    );
    expect(await context.client.config.responseChecksumValidation()).toBe(
      'WHEN_REQUIRED',
    );
    expect(
      await context.signingClient.config.requestChecksumCalculation(),
    ).toBe('WHEN_REQUIRED');
  });
});
