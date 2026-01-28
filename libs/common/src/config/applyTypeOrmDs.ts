import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';

interface ApplyTypeOrmDsOptions {
  configKey?: string;
  datasourceNameList?: string[];
}

/**
 * 自动注册 TypeORM 数据源配置
 * 要求config模块必须有'datasource'配置文件项，返回{default:{}, ...}
 */
export function applyTypeOrmDs(ApplyTypeOrmDsOptions?: ApplyTypeOrmDsOptions) {
  const usedConfigKey = ApplyTypeOrmDsOptions?.configKey || 'datasource';
  const usedDatasourceNameList = ApplyTypeOrmDsOptions?.datasourceNameList || [
    'default',
  ];
  const dsList: ReturnType<typeof TypeOrmModule.forRootAsync>[] = [];
  for (const dsName of usedDatasourceNameList) {
    dsList.push(
      TypeOrmModule.forRootAsync({
        useFactory: (configService: ConfigService) => {
          // 拿出对应数据源配置
          const dsConfig = configService.get<{ [key: string]: any }>(
            usedConfigKey,
          )?.[dsName] as TypeOrmModuleOptions;
          if (!dsConfig) {
            throw new Error(
              `Datasource configuration for '${dsName}' not found under key '${usedConfigKey}'`,
            );
          }
          return {
            ...dsConfig,
            // 强制不开启数据库迁移同步
            synchronize: false,
          };
        },
        inject: [ConfigService],
      }),
    );
  }
  return dsList;
}
