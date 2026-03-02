import { DynamicModule, Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CoreRequestLogEntity } from '@thomas/nestjs/entities/core/sys/core-request-log.entity';
import { REQUEST_LOGS_OPTIONS } from './constants';
import {
  RequestLogsModuleOptions,
  RequestLogsResolvedOptions,
} from './request-logs.types';
import { RequestLogsService } from './request-logs.service';
import { RequestLogsInterceptor } from './request-logs.interceptor';
import { RequestLogsControlService } from './request-logs-control.service';
import { REQUEST_LOGS_DEFAULT_KAFKA_TOPIC } from './constants';
import { RequestLogsKafkaConsumer } from './request-logs.kafka-consumer';

@Global()
@Module({})
export class RequestLogsModule {
  static forRoot(options: RequestLogsModuleOptions): DynamicModule {
    if (!options?.systemType) {
      throw new Error(
        'RequestLogsModule.forRoot options.systemType is required',
      );
    }

    const mergedOptions: RequestLogsResolvedOptions = {
      systemType: options.systemType,
      enabled: options.enabled ?? true,
      persistenceMode: options.persistenceMode ?? 'database',
      kafkaTopic: options.kafkaTopic ?? REQUEST_LOGS_DEFAULT_KAFKA_TOPIC,
      includeHeaders: options.includeHeaders ?? true,
      captureRequestBodyByDefault: options.captureRequestBodyByDefault ?? false,
      captureResponseBodyByDefault:
        options.captureResponseBodyByDefault ?? false,
      maxBodyLength: options.maxBodyLength ?? 50000,
      maskedHeaders: options.maskedHeaders ?? ['authorization', 'cookie'],
      ignorePaths: options.ignorePaths ?? [],
      skip: options.skip,
    };
    const shouldEnableKafkaConsumer = mergedOptions.persistenceMode === 'kafka';

    return {
      global: true,
      module: RequestLogsModule,
      imports: [TypeOrmModule.forFeature([CoreRequestLogEntity])],
      controllers: shouldEnableKafkaConsumer ? [RequestLogsKafkaConsumer] : [],
      providers: [
        {
          provide: REQUEST_LOGS_OPTIONS,
          useValue: mergedOptions,
        },
        RequestLogsService,
        RequestLogsControlService,
        RequestLogsInterceptor,
        ...(shouldEnableKafkaConsumer ? [RequestLogsKafkaConsumer] : []),
        {
          provide: APP_INTERCEPTOR,
          useExisting: RequestLogsInterceptor,
        },
      ],
      exports: [
        REQUEST_LOGS_OPTIONS,
        RequestLogsService,
        RequestLogsControlService,
        RequestLogsInterceptor,
      ],
    };
  }
}
