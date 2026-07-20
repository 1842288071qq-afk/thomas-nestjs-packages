# S3Storage 使用说明

## 1. OSS 配置结构（固定）

`sys_oss_config` 的端点字段：

- `endpoint`: 公网端点，始终用于浏览器、外部服务和预签名 URL。
- `internalEndpoint`: Node.js 服务端可选的内网端点。
- `useInternalEndpoint`: 服务端是否使用内网端点，默认 `false`；开启时 `internalEndpoint` 必填。

`sys_oss_config.config` 统一使用 `OssS3Config`：

- `accessKeyId`: S3 访问密钥 ID（必填）
- `secretAccessKey`: S3 访问密钥 Secret（必填）
- `region`: 区域（必填）
- `sessionToken`: 临时凭证 token（可选）
- `provider`: `s3` 或 `aliyun`（可选，默认 `s3`）
- `addressingStyle`: `virtual-hosted` 或 `path`（可选，默认 `virtual-hosted`）
- `forcePathStyle`: 旧版兼容字段，新配置应使用 `addressingStyle`
- `domain`: 对象访问域名（可选，必须是完整的 HTTP/HTTPS Origin，不含路径）
- `signingExpiresIn`: 预签名默认过期秒数（可选）
- `multipartChunkSize`: 默认分片大小（可选，默认 8 MiB）
- `extensions`: 扩展配置（可选，后续扩展统一放这里）

阿里云 OSS 只允许 `provider: "aliyun"` 配合
`addressingStyle: "virtual-hosted"`。服务端会拒绝 path-style 配置。

阿里云配置填写 `domain` 后，GET 预签名 URL 会使用该自定义域名，适用于
OSS Bucket 已绑定的 CNAME 域名在线预览；自定义域名不替代对象存储操作端点。
若开启 `useInternalEndpoint`，Node.js 上传、下载、Head、列举、初始化及
合并分片走 `internalEndpoint`；浏览器直传/分片和 GET 预签名仍使用公网
`endpoint`。填写自定义域名前必须先在 OSS 控制台绑定域名并完成 DNS CNAME 与 HTTPS
证书配置。不要直接填写 OSS 提供的 CNAME 解析目标域名。

示例：

```json
{
  "name": "MinIO-生产",
  "code": "minio_prod",
  "bucket": "app-assets",
  "endpoint": "https://minio.example.com",
  "useInternalEndpoint": false,
  "config": {
    "accessKeyId": "xxxx",
    "secretAccessKey": "xxxx",
    "region": "us-east-1",
    "provider": "s3",
    "addressingStyle": "path",
    "domain": "https://cdn.example.com",
    "extensions": {
      "provider": "minio"
    }
  }
}
```

阿里云配置模板见同目录
[`oss-config.example.json`](./oss-config.example.json)。

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
    return await this.s3StorageService.generatePresignedGetUrl({
      ossConfigCode: 'minio_prod',
      key: 'demo/hello.txt',
      expiresIn: 600,
    });
  }

  async signPutUrl() {
    return await this.s3StorageService.generatePresignedPutUrl({
      ossConfigCode: 'minio_prod',
      key: 'demo/client-upload.txt',
      contentType: 'text/plain',
      expiresIn: 600,
    });
  }
}
```

## 4. 分片上传流程

1. `initMultipartUpload` 获取 `uploadId`
2. 客户端场景：服务端调用 `generatePresignedUploadPartUrl` 为每个分片生成 URL
3. 客户端按分片 URL 直接上传到 OSS
4. 服务端收集每个分片的 `partNumber + eTag`
5. 调用 `completeMultipartUpload` 合并
6. 失败时调用 `abortMultipartUpload` 终止

服务端生成分片预签名示例：

```typescript
const signedPart = await this.s3StorageService.generatePresignedUploadPartUrl({
  ossConfigCode: 'minio_prod',
  key: 'big/lesson.mp4',
  uploadId,
  partNumber: 1,
  expiresIn: 600,
});
```

传统服务端直传分片（可选）：

1. `initMultipartUpload` 获取 `uploadId`
2. 多次调用 `uploadPart` 上传分片
3. （可选）调用 `listUploadParts` 校验分片状态
4. 调用 `completeMultipartUpload` 合并
5. 失败时调用 `abortMultipartUpload` 终止
