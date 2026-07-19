import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FileManagementModule as CoreFileManagementModule } from '@thomas/nestjs/core/nest/file-management/file-management.module';
import { S3StorageModule } from '@thomas/nestjs/core/nest/s3-storage';
import { FileController } from './file.controller';
import { BusinessFileController } from './business-file.controller';
import { MultipartUploadService } from './multipart-upload.service';
import { LocalMultipartUploadService } from './local-multipart-upload.service';
import { SharedServicesModule } from '../../shared/services/shared-services.module';
import { AccountAvatarService } from './account-avatar.service';

@Module({
  imports: [
    CoreFileManagementModule,
    S3StorageModule,
    SharedServicesModule,
    EventEmitterModule,
  ],
  controllers: [FileController, BusinessFileController],
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
