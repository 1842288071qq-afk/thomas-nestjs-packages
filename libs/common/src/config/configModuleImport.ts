import { ConfigModule, registerAs } from '@nestjs/config';
import appConfig from './app.config';
import fileConfig from './file.config';
import './config.interface';
import { redisConfig } from './redis.config';
import { sessionConfig } from './session';
import { jwtConfig } from './jwt.config';

interface ConfigModuleImportOptions {
  // 写在代码里面的配置
  configs: Array<ReturnType<typeof registerAs>>;
  // 变量环境名称,这里通过工程根目录env绑定为{appName}.env
  envName: string;
}

/**
 * nestjs/config模块导入模版
 * @returns
 */
export function configModuleImport(option: ConfigModuleImportOptions) {
  const { configs, envName } = option;
  return ConfigModule.forRoot({
    isGlobal: true,
    load: [
      ...configs,
      appConfig,
      fileConfig,
      redisConfig,
      sessionConfig,
      jwtConfig,
    ],
    // 环境变量文件路径
    envFilePath: [`./env/${envName}.local`, `./env/${envName}.env`],
  });
}
