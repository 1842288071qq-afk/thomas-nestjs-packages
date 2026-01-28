import { Module, MiddlewareConsumer, NestModule, Global } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { ThreadLocal } from './thread-local';
import { ThreadLocalMiddleware } from './thread-local.middleware';

@Global() // 👈 强烈建议：全局模块
@Module({
  providers: [
    ThreadLocal,
    {
      provide: AsyncLocalStorage,
      useValue: new AsyncLocalStorage(),
    },
  ],
  exports: [ThreadLocal],
})
export class ThreadLocalModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ThreadLocalMiddleware).forRoutes('*path'); // 👈 全局请求
  }
}
