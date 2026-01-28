import { Module } from '@nestjs/common';
import { SharedServicesModule } from '../../shared-services.module';
import { AccountDeserializeService } from './account-deserialize.service';
import { AccountDeserializeGuard } from './account-deserialize.guard';
import { APP_GUARD } from '@nestjs/core';
import '../../types/shared-types';

@Module({
  imports: [SharedServicesModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccountDeserializeGuard,
    },
    AccountDeserializeService,
    AccountDeserializeGuard,
  ],
  exports: [AccountDeserializeService, AccountDeserializeGuard],
})
export class AccountDeserializeModule {}
