import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PermissionService } from './permission.service';
import { CoreEntityFeatureModule } from '../../CoreEntityFeature.module';
import { CacheModule } from '@thomas/nestjs/core/nest/cache/cache.module';
import '../../types/shared-types';

@Module({
  imports: [CoreEntityFeatureModule, CacheModule],
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
