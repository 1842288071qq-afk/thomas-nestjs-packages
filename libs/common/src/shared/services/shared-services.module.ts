import { Module } from '@nestjs/common';
import { CacheModule } from '@thomas/nestjs/core/nest/cache/cache.module';
import { BullMQModule } from '@thomas/nestjs/core/nest/bullmq';
import { CoreEntityFeatureModule } from '../CoreEntityFeature.module';
import { PermissionModule } from '../guards/permission/permission.module';
import { FindAccountService } from './find-account.service';
import { OpUserSharedService } from './op-user-shared.service';
import { OpRoleSharedService } from './op-role-shared.service';
import { IdentityActiveService } from './identity-active.service';

import { PasswordUtil } from '../../utils/password';
import { DataScopeEngine } from '../../utils/dataScopeEngine';

@Module({
  imports: [
    CoreEntityFeatureModule,
    CacheModule,
    BullMQModule.forRootFromConfig(),
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
