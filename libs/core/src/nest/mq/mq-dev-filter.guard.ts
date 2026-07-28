import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaContext } from '@nestjs/microservices';
import { AppConfig } from '@qyy-code-lego/nestjs/common/config/config.interface';

@Injectable()
export class MqDevFilterGuard implements CanActivate {
  private readonly logger = new Logger(MqDevFilterGuard.name);
  private readonly devName: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const appConfig = this.configService.get<AppConfig>('app');
    this.devName = appConfig?.devName;
  }

  canActivate(context: ExecutionContext): boolean {
    // 只有在开发环境下且配置了 devName 时才启用过滤
    if (!this.devName) {
      return true;
    }

    // 处理 Kafka 上下文
    if (context.getType() === 'rpc') {
      const rpcContext = context.switchToRpc();
      const metadata = rpcContext.getContext<KafkaContext>();

      // 如果是 Kafka 消息
      if (metadata instanceof KafkaContext) {
        const message = metadata.getMessage();
        const msgDevName = message.headers?.['x-dev-name']?.toString();

        if (msgDevName && msgDevName !== this.devName) {
          this.logger.debug(
            `[Kafka Filter] Ignore message from ${msgDevName}, current dev: ${this.devName}`,
          );
          return false;
        }
      }

      // 如果是 RabbitMQ 消息 (根据需要也可以扩展 headers 过滤)
      // RMQ 默认通过队列隔离了，这里主要是 Kafka 共享 Topic 场景
    }

    return true;
  }
}
