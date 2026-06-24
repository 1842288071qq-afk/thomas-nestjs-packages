import { Module } from '@nestjs/common';
import { SharedServicesModule } from '../shared/services/shared-services.module';
import { OpPermissionService } from './opPermission/opPermission.service';
import { OpDeptService } from './opDept/opDept.service';
import { SharedFileUploadModule } from './file-management/shared-file-upload.module';
import { OpUserBootstrapTask } from './opUser/opUser.bootstrap.task';

@Module({
  imports: [SharedServicesModule, SharedFileUploadModule],
  providers: [OpPermissionService, OpDeptService, OpUserBootstrapTask],
  exports: [
    SharedServicesModule,
    SharedFileUploadModule,
    OpPermissionService,
    OpDeptService,
    OpUserBootstrapTask,
  ],
})
export class CommonBusinessModule {}
