import { NestFactory } from '@nestjs/core';
import { PlaygroundModule } from './playground.module';
import { MqModule } from '@app/core/nest/mq/mq.module';
import 'source-map-support/register';
import { JwtAuthGuard } from '@app/core/nest/jwt-auth';
import { Logger } from '@nestjs/common';

// declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(PlaygroundModule);
  // 一键连接 MQ 微服务监听 (Kafka & RabbitMQ)
  MqModule.connectMicroservices(app);

  // 启动混合应用模式 (不使用 await 阻塞，在后台异步启动以提高 HTTP 启动速度)
  app.startAllMicroservices().catch((err) => {
    console.error('Microservices start failed', err);
  });

  app.useGlobalGuards(app.get(JwtAuthGuard));
  const port = process.env.PORT ?? 2500;
  await app.listen(port);
  const logger = new Logger('Playground');
  logger.log(`HTTP Server is running on: http://localhost:${port}`);

  // 官方的webpack热模块更新，不用
  // if (module.hot) {
  //   module.hot.accept();
  //   module.hot.dispose(() => app.close());
  // }
}
void bootstrap();
