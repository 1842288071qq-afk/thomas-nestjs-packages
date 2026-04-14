import { Module } from '@nestjs/common';
import { PermissionGuard } from './permission.guard';
import { PermissionService } from './permission.service';
import { CoreEntityFeatureModule } from '../../CoreEntityFeature.module';
import { CacheModule } from '@thomas/nestjs/core/nest/cache/cache.module';
import '../../types/shared-types';

@Module({
  imports: [CoreEntityFeatureModule, CacheModule],
  providers: [PermissionService, PermissionGuard],
  exports: [PermissionService, PermissionGuard],
})
export class PermissionModule {}
