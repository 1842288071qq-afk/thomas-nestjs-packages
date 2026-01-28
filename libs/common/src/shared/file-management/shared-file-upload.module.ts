import { Module } from '@nestjs/common';
import { FileManagementModule as CoreFileManagementModule } from '@app/core/nest/file-management/file-management.module';
import { FileController } from './file.controller';
import { BusinessFileController } from './business-file.controller';

@Module({
  imports: [CoreFileManagementModule],
  controllers: [FileController, BusinessFileController],
  providers: [],
  exports: [CoreFileManagementModule],
})
export class SharedFileUploadModule {}
