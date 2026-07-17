# OSS Web SDK

本库是纯浏览器 TypeScript SDK，仅依赖 `fetch`、`File`、`Blob`、
`AbortController` 等 Web 标准。NestJS 后端不会引用本库，前端可通过
`@thomas/nestjs/web/oss` 直接引用源码并交给自身构建器打包。

## 普通直传与访问链接

```typescript
import { OssWebSdk } from '@thomas/nestjs/web/oss';

const sdk = new OssWebSdk({
  baseUrl: '/api/v1',
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
});

const record = await sdk.upload({
  file,
  key: `attachments/${crypto.randomUUID()}-${file.name}`,
  ossConfigCode: 'aliyun_prod',
});

const accessUrl = await sdk.getAccessUrl({
  key: record.object,
  ossConfigCode: record.ossConfigCode,
  expiresIn: 600,
});
```

`upload` 完成对象直传后，会自动调用 `/files/oss/callback` 建立
`sys_file` 映射。后端会先执行 `HeadObject` 验证对象确实存在，并以 OSS
返回的大小、MIME 和服务端生成的访问地址落库，不信任 Web 回传的这些字段。

## 分片上传流程

```typescript
const process = sdk.createUploadProcess({
  file,
  key: `videos/${crypto.randomUUID()}-${file.name}`,
  ossConfigCode: 'aliyun_prod',
  concurrency: 4,
  retries: 2,
  signal: abortController.signal,
  onProgress: ({ percent }) => console.log(percent),
  onError: console.error,
});

const resultPromise = process.start();
process.pause();
await process.resume();
// await process.stop(); // 主动终止并清理 OSS 服务端分片
const result = await resultPromise;
```

也可以直接实例化流程并替换适配器：

```typescript
import {
  FileUploadProcess,
  S3MultipartUploadAdapter,
} from '@thomas/nestjs/web/oss';

const process = new FileUploadProcess({
  file,
  key,
  ossConfigCode,
  adapter: new S3MultipartUploadAdapter({ client: sdk.client }),
});
```

`start()` 返回的 Promise 会持续到上传最终完成；暂停不会让它提前结束。
重新调用 init 时，后端依据 `object + hash` 返回已上传分片，从而续传。
默认 hash 是文件名、大小、修改时间和 MIME 的稳定指纹；如果业务要求内容
校验或跨重命名续传，可注入 `hashProvider`（例如增量 MD5/WASM 实现）。

`fetch` 没有标准的请求体上传进度事件，因此默认 S3 适配器在每个分片完成
后更新进度，而不是报告单个 PUT 内部的字节进度。若需要更细粒度进度，可
实现 `MultipartUploadAdapter` 替换默认适配器。

## 配套后端接口

| 接口                                  | 作用                           |
| ------------------------------------- | ------------------------------ |
| `POST /files/oss/sign/put`            | 获取普通 PUT 直传地址          |
| `POST /files/oss/sign/get`            | 获取对象访问地址               |
| `POST /files/oss/callback`            | 校验对象并保存 `sys_file` 映射 |
| `POST /files/oss/multipart/init`      | 初始化或恢复分片任务           |
| `POST /files/oss/multipart/sign-part` | 获取单个分片的 PUT 地址        |
| `POST /files/oss/multipart/complete`  | 服务端核对分片、合并并完成映射 |
| `POST /files/oss/multipart/abort`     | 主动终止并清理服务端分片       |

所有路径都可通过 `OssWebSdkOptions.endpoints` 覆盖，以适配不同项目的
Controller 路由。

## OSS CORS 要求

Bucket 必须允许前端来源执行 `PUT`，允许请求头至少包含
`Content-Type`，并暴露响应头 `ETag`。后端 API 域名也需要允许前端来源
访问。预签名 URL 过期后，流程会按 `retries` 重新请求签名。
