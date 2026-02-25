import { Module } from '@nestjs/common';
import { SharedServicesModule } from '../shared/services/shared-services.module';
import { OpPermissionService } from './opPermission/opPermission.service';
import { OpDeptService } from './opDept/opDept.service';
import { SharedFileUploadModule } from './file-management/shared-file-upload.module';

@Module({
  imports: [SharedServicesModule, SharedFileUploadModule],
  providers: [OpPermissionService, OpDeptService],
  exports: [
    SharedServicesModule,
    SharedFileUploadModule,
    OpPermissionService,
    OpDeptService,
  ],
})
export class CommonBusinessModule {}
