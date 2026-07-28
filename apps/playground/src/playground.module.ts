import { Module } from '@nestjs/common';
import { PlaygroundController } from './playground.controller';
import { PlaygroundService } from './playground.service';
import { datasourceConfig } from './config/datasource.config';
import { configModuleImport } from '@qyy-code-lego/nestjs/common/config/configModuleImport';
import { applyTypeOrmDs } from '@qyy-code-lego/nestjs/common/config/applyTypeOrmDs';
import { GlobalModule } from '@qyy-code-lego/nestjs/core/nest/global.module';
import { RedisModule } from '@qyy-code-lego/nestjs/core/nest/redis/redis.module';
import { JwtAuthModule } from '@qyy-code-lego/nestjs/core/nest/jwt-auth';
import { mqConfig } from './config/mq.config';
import { MqPlaygroundModule } from './mq-playground/mq-playground.module';
import { BullmqPlaygroundModule } from './bullmq-playground/bullmq-playground.module';
import '@qyy-code-lego/nestjs/common/shared/types/shared-types';
import { CoreEntityFeatureModule } from '@qyy-code-lego/nestjs/common/shared';
import { AccountDeserializeModule } from '@qyy-code-lego/nestjs/common/shared/guards/account-deserialize/account-deserialize.module';
import { IdentityRequiredModule } from '@qyy-code-lego/nestjs/common/shared/guards/identity-required/identity-required.module';
import { PermissionModule } from '@qyy-code-lego/nestjs/common/shared/guards/permission/permission.module';

@Module({
  imports: [
    // 加载配置
    configModuleImport({
      configs: [datasourceConfig, mqConfig],
      envName: 'playground',
    }),
    // 应用数据源
    ...applyTypeOrmDs({
      configKey: 'datasource',
      datasourceNameList: ['default'],
    }),
    // 加载全局模块
    GlobalModule,
    // 加载全局entity
    CoreEntityFeatureModule,
    // account信息挂载
    AccountDeserializeModule,
    // 身份验证拦截
    IdentityRequiredModule,
    // 权限拦截
    PermissionModule,
    // 使用redis
    RedisModule,
    JwtAuthModule.forRoot(),
    // 加载MQ演示模块
    MqPlaygroundModule,
    // 加载BullMQ演示模块
    BullmqPlaygroundModule,
  ],
  controllers: [PlaygroundController],
  providers: [PlaygroundService],
})
export class PlaygroundModule {}
