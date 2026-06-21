import { SetMetadata } from '@nestjs/common';
import { HEALTH_INDICATOR_METADATA } from './health.constants';

/**
 * 标注一个 provider 为业务健康检查项（需同时 @Injectable 并实现 HealthCheck）。
 * HealthModule 通过 DiscoveryService 自动发现所有被标注的 provider 并汇入 readiness。
 *
 * @example
 * @Injectable()
 * @HealthIndicator()
 * export class QuestionBankHealth implements HealthCheck {
 *   readonly name = 'question-bank';
 *   readonly critical = true;
 *   async check() { ... }
 * }
 */
export const HealthIndicator = (): ClassDecorator =>
  SetMetadata(HEALTH_INDICATOR_METADATA, true);
