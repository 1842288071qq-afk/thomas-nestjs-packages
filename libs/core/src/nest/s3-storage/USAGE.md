# S3Storage 使用说明

## 1. OSS 配置结构（固定）

`sys_oss_config.config` 统一使用 `OssS3Config`：

- `accessKeyId`: S3 访问密钥 ID（必填）
- `secretAccessKey`: S3 访问密钥 Secret（必填）
- `region`: 区域（必填）
- `sessionToken`: 临时凭证 token（可选）
- `forcePathStyle`: 是否使用 path-style（可选，默认 false）
- `domain`: 对象访问域名/CDN 域名（可选）
- `signingExpiresIn`: 预签名默认过期秒数（可选）
- `extensions`: 扩展配置（可选，后续扩展统一放这里）

示例：

```json
{
  "name": "MinIO-生产",
  "code": "minio_prod",
  "bucket": "app-assets",
  "endpoint": "https://minio.example.com",
  "config": {
    "accessKeyId": "xxxx",
    "secretAccessKey": "xxxx",
    "region": "us-east-1",
    "forcePathStyle": true,
    "domain": "https://cdn.example.com",
    "extensions": {
      "provider": "minio"
    }
  }
}
```

## 2. 模块接入

在业务模块中引入：

```typescript
import { Module } from '@nestjs/common';
import { S3StorageModule } from '@thomas/nestjs/core/nest/s3-storage';

@Module({
  imports: [S3StorageModule],
})
export class BizModule {}
```

## 3. 服务调用示例

```typescript
import { Injectable } from '@nestjs/common';
import { S3StorageService } from '@thomas/nestjs/core/nest/s3-storage';

@Injectable()
export class DemoService {
  constructor(private readonly s3StorageService: S3StorageService) {}

  async uploadText() {
    return await this.s3StorageService.uploadObject({
      ossConfigCode: 'minio_prod',
      key: 'demo/hello.txt',
      body: Buffer.from('hello world'),
      contentType: 'text/plain',
    });
  }

  async signDownloadUrl() {
    return await this.s3StorageService.signObject({
      ossConfigCode: 'minio_prod',
      key: 'demo/hello.txt',
      operation: 'getObject',
      expiresIn: 600,
    });
  }
}
```

## 4. 分片上传流程

1. `initMultipartUpload` 获取 `uploadId`
2. 多次调用 `uploadPart` 上传分片
3. （可选）调用 `listUploadParts` 校验分片状态
4. 调用 `completeMultipartUpload` 合并
5. 失败时调用 `abortMultipartUpload` 终止
