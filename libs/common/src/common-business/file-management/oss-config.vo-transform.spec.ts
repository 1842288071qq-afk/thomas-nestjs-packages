import {
  OssAddressingStyle,
  OssProvider,
} from '@thomas/nestjs/entities/core/sys/oss-s3-config.interface';
import { SysOssConfigEntity } from '@thomas/nestjs/entities/core/sys/sys-oss-config.entity';
import { toOssConfigVO } from './oss-config.vo-transform';

describe('toOssConfigVO', () => {
  it('仅返回脱敏凭证状态，不返回 Secret 和 SessionToken', () => {
    const entity = Object.assign(new SysOssConfigEntity(), {
      code: 'aliyun_dev',
      name: '阿里云开发环境',
      bucket: 'bucket-dev',
      endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
      config: {
        accessKeyId: 'LTAI1234567890',
        secretAccessKey: 'secret-value',
        sessionToken: 'token-value',
        region: 'cn-hangzhou',
        provider: OssProvider.ALIYUN,
        addressingStyle: OssAddressingStyle.VIRTUAL_HOSTED,
      },
    });

    const plain = JSON.parse(JSON.stringify(toOssConfigVO(entity))) as Record<
      string,
      unknown
    >;
    expect(JSON.stringify(plain)).not.toContain('secret-value');
    expect(JSON.stringify(plain)).not.toContain('token-value');
    expect(plain).toMatchObject({
      config: {
        accessKeyIdMasked: 'LTAI****7890',
        hasSecretAccessKey: true,
        hasSessionToken: true,
      },
    });
  });
});
