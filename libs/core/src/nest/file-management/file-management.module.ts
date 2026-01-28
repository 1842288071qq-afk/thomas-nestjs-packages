import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigService } from '@nestjs/config';
import { SysFileEntity } from '@app/entities/core/sys/sys-file.entity';
import { SysOssConfigEntity } from '@app/entities/core/sys/sys-oss-config.entity';
import { FileService } from './file.service';
import { OssConfigService } from './oss-config.service';
import { LocalUploadService } from './local-upload.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([SysFileEntity, SysOssConfigEntity]),
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const storageRoot = configService.get<string>(
          'file.local.storageRoot',
          './uploads',
        );
        const serveRoot = configService.get<string>(
          'file.local.serveRoot',
          '/files',
        );
        return [
          {
            rootPath: storageRoot,
            serveRoot: serveRoot,
          },
        ];
      },
    }),
  ],
  providers: [FileService, OssConfigService, LocalUploadService],
  exports: [FileService, OssConfigService, LocalUploadService],
})
export class FileManagementModule {}
