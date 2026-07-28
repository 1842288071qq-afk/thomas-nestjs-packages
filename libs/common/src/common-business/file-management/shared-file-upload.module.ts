import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FileManagementModule as CoreFileManagementModule } from '@qyy-code-lego/nestjs/core/nest/file-management/file-management.module';
import { S3StorageModule } from '@qyy-code-lego/nestjs/core/nest/s3-storage';
import { FileController } from './file.controller';
import { BusinessFileController } from './business-file.controller';
import { MultipartUploadService } from './multipart-upload.service';
import { LocalMultipartUploadService } from './local-multipart-upload.service';
import { SharedServicesModule } from '../../shared/services/shared-services.module';
import { AccountAvatarService } from './account-avatar.service';
import { OssConfigController } from './oss-config.controller';
import { PermissionModule } from '../../shared/guards/permission/permission.module';

@Module({
  imports: [
    CoreFileManagementModule,
    S3StorageModule,
    SharedServicesModule,
    PermissionModule,
    EventEmitterModule,
  ],
  controllers: [FileController, BusinessFileController, OssConfigController],
  providers: [
    MultipartUploadService,
    LocalMultipartUploadService,
    AccountAvatarService,
  ],
  exports: [
    CoreFileManagementModule,
    S3StorageModule,
    MultipartUploadService,
    LocalMultipartUploadService,
  ],
})
export class SharedFileUploadModule {}
