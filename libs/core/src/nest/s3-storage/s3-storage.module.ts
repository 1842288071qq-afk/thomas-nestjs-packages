import { Module } from '@nestjs/common';
import { FileManagementModule } from '../file-management/file-management.module';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [FileManagementModule],
  providers: [S3StorageService],
  exports: [S3StorageService],
})
export class S3StorageModule {}
