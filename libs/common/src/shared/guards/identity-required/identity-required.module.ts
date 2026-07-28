import { Module } from '@nestjs/common';
import { ThreadLocalModule } from '@qyy-code-lego/nestjs/core/nest/als/thread-local.module';
import { SharedServicesModule } from '../../services/shared-services.module';
import { IdentityRequiredGuard } from './identity-required.guard';
import '../../types/shared-types';

@Module({
  imports: [ThreadLocalModule, SharedServicesModule],
  providers: [IdentityRequiredGuard],
  exports: [IdentityRequiredGuard],
})
export class IdentityRequiredModule {}
