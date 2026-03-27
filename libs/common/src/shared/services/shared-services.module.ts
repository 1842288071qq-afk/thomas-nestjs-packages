import { Injectable, Module, OnModuleInit, Logger } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@thomas/nestjs/core/nest/cache/cache.module';
import { BullMQModule } from '@thomas/nestjs/core/nest/bullmq';
import { CoreEntityFeatureModule } from '../CoreEntityFeature.module';
import { PermissionModule } from '../guards/permission/permission.module';
import { FindAccountService } from './find-account.service';
import { OpUserSharedService } from './op-user-shared.service';
import { OpRoleSharedService } from './op-role-shared.service';
import { OpDeptSharedService } from './op-dept-shared.service';
import { IdentityActiveService } from './identity-active.service';
import { UserSharedService } from './user-shared.service';
import { AccountAvatarUpdatedListener } from './account-avatar-updated.listener';

import { PasswordUtil } from '../../utils/password';
import { DataScopeEngine } from '../../utils/dataScopeEngine';

@Injectable()
class OpUserBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(OpUserBootstrapService.name);

  constructor(private readonly opUserSharedService: OpUserSharedService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.opUserSharedService.ensureBootstrapAdminUser();
    } catch (err) {
      this.logger.error(
        'OpUser bootstrap failed',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}

@Module({
  imports: [
    CoreEntityFeatureModule,
    CacheModule,
    EventEmitterModule.forRoot(),
    BullMQModule.forRootFromConfig(),
    PermissionModule,
  ],
  providers: [
    FindAccountService,
    OpUserSharedService,
    UserSharedService,
    OpRoleSharedService,
    OpDeptSharedService,
    IdentityActiveService,
    AccountAvatarUpdatedListener,
    PasswordUtil,
    DataScopeEngine,
    OpUserBootstrapService,
  ],
  exports: [
    FindAccountService,
    OpUserSharedService,
    UserSharedService,
    OpRoleSharedService,
    OpDeptSharedService,
    IdentityActiveService,
    PasswordUtil,
    DataScopeEngine,
  ],
})
export class SharedServicesModule {}
