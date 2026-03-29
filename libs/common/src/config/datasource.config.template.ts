import { SnakeNamingStrategy } from 'typeorm-naming-strategies/snake-naming.strategy';
import { DataSourceConfig } from './config.interface';

type DatasourceType =
  | 'postgres'
  | 'mysql'
  | 'sqlite'
  | 'mariadb'
  | 'mongodb'
  | 'oracle'
  | 'mssql'
  | 'sqljs'
  | 'cordova'
  | 'nativescript'
  | 'react-native'
  | 'expo'
  | 'better-sqlite3';

export const datasourceConfigObject = (
  type: DatasourceType,
): Record<string, DataSourceConfig> => {
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = parseInt(process.env.DATABASE_PORT || '5432', 10);
  const username = process.env.DATABASE_USER || 'postgres';
  const password = process.env.DATABASE_PASSWORD || 'postgres';
  const database = process.env.DATABASE_NAME || 'postgres';
  return {
    default: {
      type,
      host,
      port,
      username,
      password,
      database,
      autoLoadEntities: true,
      synchronize: false,
      logging: process.env.TYPEORM_LOGGING === 'true' ? true : false,
      namingStrategy: new SnakeNamingStrategy(),
    },
  };
};
