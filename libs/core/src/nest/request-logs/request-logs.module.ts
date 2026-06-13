import {
  DynamicModule,
  Global,
  InjectionToken,
  Module,
  ModuleMetadata,
  OptionalFactoryDependency,
  Provider,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CoreRequestLogEntity } from '@thomas/nestjs/entities/core/sys/core-request-log.entity';
import {
  REQUEST_LOGS_DEFAULT_KAFKA_TOPIC,
  REQUEST_LOGS_OPTIONS,
} from './constants';
import {
  RequestLogsModuleOptions,
  RequestLogsResolvedOptions,
} from './request-logs.types';
import { RequestLogsService } from './request-logs.service';
import { RequestLogsInterceptor } from './request-logs.interceptor';
import { RequestLogsControlService } from './request-logs-control.service';
import { RequestLogsKafkaConsumer } from './request-logs.kafka-consumer';

export interface RequestLogsModuleAsyncOptions<
  TArgs extends unknown[] = unknown[],
> extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (
    ...args: TArgs
  ) => Promise<RequestLogsModuleOptions> | RequestLogsModuleOptions;
  inject?: (InjectionToken | OptionalFactoryDependency)[];
  enableKafkaConsumer?: boolean;
}

@Global()
@Module({})
export class RequestLogsModule {
  static forRoot(options: RequestLogsModuleOptions): DynamicModule {
    const mergedOptions = this.resolveOptions(options);
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

  static forRootAsync<TArgs extends unknown[]>(
    asyncOptions: RequestLogsModuleAsyncOptions<TArgs>,
  ): DynamicModule {
    const shouldEnableKafkaConsumer = asyncOptions.enableKafkaConsumer === true;

    const asyncProvider: Provider = {
      provide: REQUEST_LOGS_OPTIONS,
      useFactory: async (...args: TArgs) => {
        const options = await asyncOptions.useFactory(...args);
        return this.resolveOptions(options);
      },
      inject: asyncOptions.inject || [],
    };

    return {
      global: true,
      module: RequestLogsModule,
      imports: [
        ...(asyncOptions.imports || []),
        TypeOrmModule.forFeature([CoreRequestLogEntity]),
      ],
      controllers: shouldEnableKafkaConsumer ? [RequestLogsKafkaConsumer] : [],
      providers: [
        asyncProvider,
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

  private static resolveOptions(
    options: RequestLogsModuleOptions,
  ): RequestLogsResolvedOptions {
    if (!options?.systemType) {
      throw new Error('RequestLogsModule options.systemType is required');
    }

    return {
      systemType: options.systemType,
      accessLogEnabled:
        options.accessLogEnabled ?? options.printToStdout ?? false,
      persistEnabled: options.persistEnabled ?? options.enabled ?? false,
      printToStdout: options.printToStdout ?? false,
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
  }
}
