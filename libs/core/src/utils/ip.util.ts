import { Request } from 'express';

/**
 * 获取客户端真实 IP 地址
 * 兼容多级代理场景，按优先级尝试获取真实 IP
 *
 * @param req Express Request 对象
 * @returns IP 地址字符串
 */
export function getRealIp(req: Request): string {
  // 1. 优先尝试 X-Forwarded-For (标准代理头)
  // 格式通常为: client, proxy1, proxy2
  // 我们取第一个非 unknown 的 IP 作为真实 IP
  const xForwardedFor =
    req.headers['x-forwarded-for'] || req.headers['x-forwarded-host']; // 某些特殊配置可能会用到 x-forwarded-host，但通常是 x-forwarded-for

  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor)
      ? xForwardedFor
      : xForwardedFor.split(',');

    for (const rawIp of ips) {
      const ip = rawIp.trim();
      if (isValidIp(ip)) {
        return normalizeIp(ip);
      }
    }
  }

  // 2. 尝试 X-Real-IP (Nginx 常用配置)
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp && typeof xRealIp === 'string') {
    const ip = xRealIp.trim();
    if (isValidIp(ip)) {
      return normalizeIp(ip);
    }
  }

  // 3. 尝试其他常见的非标准代理头
  const fallbackHeaders = [
    'proxy-client-ip',
    'wl-proxy-client-ip',
    'http_client_ip',
    'http_x_forwarded_for',
    'cf-connecting-ip', // Cloudflare
    'true-client-ip', // Akamai / Cloudflare
  ];

  for (const header of fallbackHeaders) {
    const val = req.headers[header];
    if (val && typeof val === 'string') {
      const ips = val.split(',');
      const ip = ips[0].trim();
      if (isValidIp(ip)) {
        return normalizeIp(ip);
      }
    }
  }

  // 4. 回退到 Express 解析的 req.ip (依赖 trust proxy 配置)
  if (req.ip && isValidIp(req.ip)) {
    return normalizeIp(req.ip);
  }

  // 5. 最终回退到 socket 连接 IP
  if (req.socket && req.socket.remoteAddress) {
    const ip = req.socket.remoteAddress;
    if (isValidIp(ip)) {
      return normalizeIp(ip);
    }
  }

  return '127.0.0.1'; // 无法获取时默认返回本地回环
}

/**
 * 规范化 IP 地址
 * 处理 IPv6 映射的 IPv4 地址 (::ffff:127.0.0.1)
 */
function normalizeIp(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

/**
 * 验证 IP 是否有效
 */
function isValidIp(ip: string): boolean {
  return (
    !!ip &&
    ip.length > 0 &&
    ip.toLowerCase() !== 'unknown' &&
    // 简单的排除无效字符检查，实际生产可以使用 regex 验证 IP 格式
    !ip.includes('undefined') &&
    !ip.includes('null')
  );
}
