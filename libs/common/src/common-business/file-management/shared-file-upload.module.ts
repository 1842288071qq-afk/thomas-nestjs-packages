import { Module } from '@nestjs/common';
import { FileManagementModule as CoreFileManagementModule } from '@thomas/nestjs/core/nest/file-management/file-management.module';
import { S3StorageModule } from '@thomas/nestjs/core/nest/s3-storage';
import { FileController } from './file.controller';
import { BusinessFileController } from './business-file.controller';
import { MultipartUploadService } from './multipart-upload.service';

@Module({
  imports: [CoreFileManagementModule, S3StorageModule],
  controllers: [FileController, BusinessFileController],
  providers: [MultipartUploadService],
  exports: [CoreFileManagementModule, S3StorageModule, MultipartUploadService],
})
export class SharedFileUploadModule {}
