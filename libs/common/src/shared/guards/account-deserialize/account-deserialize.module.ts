import { Module } from '@nestjs/common';
import { SharedServicesModule } from '../../services/shared-services.module';
import { AccountDeserializeService } from './account-deserialize.service';
import { AccountDeserializeGuard } from './account-deserialize.guard';
import '../../types/shared-types';

@Module({
  imports: [SharedServicesModule],
  providers: [AccountDeserializeService, AccountDeserializeGuard],
  exports: [AccountDeserializeService, AccountDeserializeGuard],
})
export class AccountDeserializeModule {}
