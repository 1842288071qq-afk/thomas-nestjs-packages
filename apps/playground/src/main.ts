import { NestFactory } from '@nestjs/core';
import { PlaygroundModule } from './playground.module';
import { MqModule } from '@qyy-code-lego/nestjs/core/nest/mq/mq.module';
import 'source-map-support/register';
import { Logger } from '@nestjs/common';
import { connectGlobalGuards } from '@qyy-code-lego/nestjs/common';

// declare const module: any;

async function bootstrap() {
  const logger = new Logger('Playground');
  const app = await NestFactory.create(PlaygroundModule);

  // 启用关闭钩子监听器，启动这个会有所有的微服务关日志
  // app.enableShutdownHooks();

  connectGlobalGuards(app);
  const port = process.env.PORT ?? 2500;
  await app.listen(port);
  logger.log(`App HTTP Server is running on: http://localhost:${port} ✅`);

  // 一键连接 MQ 微服务监听 (Kafka & RabbitMQ)
  MqModule.connectMicroservices(app);

  // 启动混合应用模式
  app
    .startAllMicroservices()
    .catch((err) => {
      logger.error('Microservices start failed ⚠️', err);
    })
    .finally(() => {
      logger.log('Microservices start process completed ✅');
    });

  // 官方的webpack热模块更新，不用
  // if (module.hot) {
  //   mo
  // dule.hot.accept();
  //   module.hot.dispose(() => app.close());
  // }
}
void bootstrap();
