import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThreadLocalModule } from '@app/core/nest/als/thread-local.module';
import { SharedServicesModule } from '../../services/shared-services.module';
import { IdentityRequiredGuard } from './identity-required.guard';
import '../../types/shared-types';

@Module({
  imports: [ThreadLocalModule, SharedServicesModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: IdentityRequiredGuard,
    },
    IdentityRequiredGuard,
  ],
  exports: [IdentityRequiredGuard],
})
export class IdentityRequiredModule {}
