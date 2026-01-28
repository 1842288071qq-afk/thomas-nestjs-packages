import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PermissionService } from './permission.service';
import { EntityFeatureModule } from '../../EntityFeature.module';
import { CacheModule } from '@app/core/nest/cache/cache.module';
import '../../types/shared-types';

@Module({
  imports: [EntityFeatureModule, CacheModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    PermissionService,
    PermissionGuard,
  ],
  exports: [PermissionService, PermissionGuard],
})
export class PermissionModule {}
