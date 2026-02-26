export interface OssS3Config {
  /**
   * 访问密钥 ID（AK），用于 S3 鉴权。
   */
  accessKeyId: string;

  /**
   * 访问密钥 Secret（SK），用于 S3 鉴权。
   */
  secretAccessKey: string;

  /**
   * 存储区域，例如 `us-east-1`、`ap-southeast-1`。
   */
  region: string;

  /**
   * 临时凭证 Token（使用 STS 时填写）。
   */
  sessionToken?: string;

  /**
   * 是否启用 path-style 访问。
   * - `true`: `endpoint/bucket/key`
   * - `false`: `bucket.endpoint/key`（或服务端默认）
   */
  forcePathStyle?: boolean;

  /**
   * 对象访问域名（可用于 CDN 或自定义下载域名）。
   */
  domain?: string;

  /**
   * 默认预签名过期时间（秒）。
   * 业务未显式传入 expiresIn 时可作为默认值。
   */
  signingExpiresIn?: number;

  /**
   * 分片上传默认分片大小（字节）。
   * 客户端未传 chunkSize 时使用。
   */
  multipartChunkSize?: number;

  /**
   * 分片上传默认分片大小（字节），兼容旧字段名。
   */
  chunkSize?: number;

  /**
   * 扩展配置（预留字段）。
   * 后续新增供应商差异化参数时统一放在该对象内。
   */
  extensions?: Record<string, unknown>;
}
