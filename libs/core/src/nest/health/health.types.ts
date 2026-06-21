export type HealthStatus = 'up' | 'degraded' | 'down';

export interface HealthCheckResult {
  status: HealthStatus;
  /** 该检查耗时（毫秒），由聚合器统一填充 */
  durationMs?: number;
  /** 任意可扩展明细（计数、延迟、版本等），禁放敏感信息 */
  detail?: Record<string, unknown>;
  /** 异常/超时时的简短原因 */
  error?: string;
}

/**
 * 业务健康检查 hook 接口。实现它并标注 @HealthIndicator() 即被自动发现并汇入 readiness。
 */
export interface HealthCheck {
  /** 在 checks 字典中的键名，需稳定且唯一 */
  readonly name: string;
  /** 是否关键：true 失败 → 整体 down；false 失败 → 整体 degraded。默认 true。 */
  readonly critical?: boolean;
  check(): Promise<HealthCheckResult> | HealthCheckResult;
}

/** liveness（探活）最小响应：不含依赖细节，可安全公开 */
export interface LivenessReport {
  status: 'up';
  app: string;
  pid: number;
  uptimeSec: number;
}

/** readiness（就绪）完整响应：含各项检查明细，应受保护 */
export interface HealthReport {
  status: HealthStatus;
  app: string;
  pid: number;
  host: string;
  port: number;
  uptimeSec: number;
  timestamp: string;
  checks: Record<string, HealthCheckResult>;
}
