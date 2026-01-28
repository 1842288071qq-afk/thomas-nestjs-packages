import { AccountEntities } from '@app/entities/core/account';
import { AuthEntities } from '@app/entities/auth';
import { OpAccountEntities } from '@app/entities/op-account';
import { OtherEntities } from '@app/entities/other';
import { SysEntities } from '@app/entities/core/sys';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // 运营平台账号系统
      ...OpAccountEntities,
      // 考核云、医考拉账号系统
      ...AccountEntities,
      // 限业务系统
      ...AuthEntities,
      // 其他通用表
      ...OtherEntities,
      // 系统级表
      ...SysEntities,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class EntityFeatureModule {}
