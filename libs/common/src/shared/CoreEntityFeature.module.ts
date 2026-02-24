import { AccountEntities } from '@thomas/nestjs/entities/core/account';
import { IdentityEntities } from '@thomas/nestjs/entities/core/identity';
import { CommonBusinessEntities } from '@thomas/nestjs/entities/core/common-business';
import { SysEntities } from '@thomas/nestjs/entities/core/sys';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // 账号
      ...AccountEntities,
      // 身份表
      ...IdentityEntities,
      // 通用业务（用户、运营用户、角色、权限、部门等）
      ...CommonBusinessEntities,
      // 系统通用（文件、配置等）
      ...SysEntities,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class CoreEntityFeatureModule {}
