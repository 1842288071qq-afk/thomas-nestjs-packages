/** @HealthIndicator() 在类上写的元数据键，供 DiscoveryService 发现 */
export const HEALTH_INDICATOR_METADATA = 'nestjs:health-indicator';

/** 详情接口令牌请求头（小写，express headers 已规范化为小写） */
export const HEALTH_TOKEN_HEADER = 'x-health-token';

/** 健康接口路由前缀（固定，不随 apiPrefix 变化；apps 需在 setGlobalPrefix 中排除） */
export const HEALTH_ROUTE_BASE = 'health';
