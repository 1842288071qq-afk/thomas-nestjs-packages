import { OssSdkError } from './errors';

export interface BuildOssObjectUrlOptions {
  domain: string;
  key: string;
}

/** 使用 OSS 自定义域名安全组装公开对象 URL。私有对象仍应申请预签名 URL。 */
export function buildOssObjectUrl(options: BuildOssObjectUrlOptions): string {
  let url: URL;
  try {
    url = new URL(options.domain);
  } catch {
    throw new OssSdkError('OSS domain 必须是完整 URL');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new OssSdkError('OSS domain 仅支持 HTTP/HTTPS');
  }
  if (!options.key || options.key.startsWith('/')) {
    throw new OssSdkError('OSS object key 必须是非空相对路径');
  }
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${options.key
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')}`;
  return url.toString();
}
