import { Module } from '@nestjs/common';
import { SharedServicesModule } from '../shared/services/shared-services.module';
import { OpPermissionService } from './opPermission/opPermission.service';
import { OpDeptService } from './opDept/opDept.service';

@Module({
  imports: [SharedServicesModule],
  providers: [OpPermissionService, OpDeptService],
  exports: [SharedServicesModule, OpPermissionService, OpDeptService],
})
export class CommonBusinessModule {}
