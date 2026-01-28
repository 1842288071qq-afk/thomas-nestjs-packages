import { Module } from '@nestjs/common';
import { PlaygroundController } from './playground.controller';
import { PlaygroundService } from './playground.service';
import { datasourceConfig } from './config/datasource.config';
import { configModuleImport } from '@app/common/config/configModuleImport';
import { applyTypeOrmDs } from '@app/common/config/applyTypeOrmDs';
import { User } from './entities/User';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { GlobalModule } from '@app/core/nest/global.module';
import { RedisModule } from '@app/core/nest/redis/redis.module';
import { redisConfig } from './config/redis.config';
import { JwtAuthModule } from '@app/core/nest/jwt-auth';
import { jwtConfig } from './config/jwt.config';
import { mqConfig } from './config/mq.config';
import { MqPlaygroundModule } from './mq-playground/mq-playground.module';
import { BullmqPlaygroundModule } from './bullmq-playground/bullmq-playground.module';
import '@app/common/shared/types/shared-types';

@Module({
  imports: [
    // 加载配置
    configModuleImport({
      configs: [datasourceConfig, redisConfig, jwtConfig, mqConfig],
      envName: 'playground',
    }),
    // 应用数据源
    ...applyTypeOrmDs({
      configKey: 'datasource',
      datasourceNameList: ['default'],
    }),
    // 加载全局模块
    GlobalModule,
    // 使用redis
    RedisModule,
    JwtAuthModule.forRoot(),
    // 加载entity
    TypeOrmModule.forFeature([User]),
    // 加载user模块
    UserModule,
    // 加载MQ演示模块
    MqPlaygroundModule,
    // 加载BullMQ演示模块
    BullmqPlaygroundModule,
  ],
  controllers: [PlaygroundController],
  providers: [PlaygroundService],
})
export class PlaygroundModule {}
