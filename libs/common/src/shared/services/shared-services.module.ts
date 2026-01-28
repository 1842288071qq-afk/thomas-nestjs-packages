import { Module } from '@nestjs/common';
import { CacheModule } from '@app/core/nest/cache/cache.module';

import { ScheduleModule } from '@nestjs/schedule';
import { EntityFeatureModule } from '../EntityFeature.module';
import { PermissionModule } from '../guards/permission/permission.module';
import { FindAccountService } from './find-account.service';
import { OpUserSharedService } from './op-user-shared.service';
import { OpRoleSharedService } from './op-role-shared.service';
import { IdentityActiveService } from './identity-active.service';

import { PasswordUtil } from '../../utils/password';
import { DataScopeEngine } from '../../utils/dataScopeEngine';

@Module({
  imports: [
    EntityFeatureModule,
    CacheModule,
    ScheduleModule.forRoot(),
    PermissionModule,
  ],
  providers: [
    FindAccountService,
    OpUserSharedService,
    OpRoleSharedService,
    IdentityActiveService,
    PasswordUtil,
    DataScopeEngine,
  ],
  exports: [
    FindAccountService,
    OpUserSharedService,
    OpRoleSharedService,
    IdentityActiveService,
    PasswordUtil,
    DataScopeEngine,
  ],
})
export class SharedServicesModule {}
