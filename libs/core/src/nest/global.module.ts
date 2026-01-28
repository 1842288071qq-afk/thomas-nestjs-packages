import { Global, Module } from '@nestjs/common';
import { CatchEverythingFilter } from './catch.filter';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ValidationPipeWithTransform } from './validate.pipe';
import { ThreadLocalModule } from './als/thread-local.module';
import { DateSerializeInterceptor } from './transform/DateSerialize.interceptor';
import { CacheModule } from './cache/cache.module';
import { DictionaryModule } from './dictionary/dictionary.module';
import { CityModule } from './city/city.module';
import { FileManagementModule } from './file-management/file-management.module';

@Global()
@Module({
  imports: [
    ThreadLocalModule,
    CacheModule,
    DictionaryModule,
    CityModule,
    FileManagementModule,
  ],
  providers: [
    // 全局错误处理过滤
    {
      provide: APP_FILTER,
      useClass: CatchEverythingFilter,
    },
    // 全局参数转换和校验管道
    {
      provide: APP_PIPE,
      useClass: ValidationPipeWithTransform,
    },
    // 全局日期序列化拦截器（可能会存在性能问题）
    {
      provide: APP_INTERCEPTOR,
      useClass: DateSerializeInterceptor,
    },
    DateSerializeInterceptor,
    // 全局JSON序列化
  ],
  exports: [
    DateSerializeInterceptor,
    CacheModule,
    DictionaryModule,
    FileManagementModule,
  ],
})
export class GlobalModule {}
