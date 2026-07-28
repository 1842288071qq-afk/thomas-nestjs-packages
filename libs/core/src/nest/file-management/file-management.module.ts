import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigService } from '@nestjs/config';
import { SysFileEntity } from '@qyy-code-lego/nestjs/entities/core/sys/sys-file.entity';
import { SysOssConfigEntity } from '@qyy-code-lego/nestjs/entities/core/sys/sys-oss-config.entity';
import { FileService } from './file.service';
import { OssConfigService } from './oss-config.service';
import { LocalUploadService } from './local-upload.service';
import path from 'path';
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
            rootPath: path.resolve(storageRoot),
            serveRoot: serveRoot,
            serveStaticOptions: {
              index: false, // 禁用自动查找 index.html，避免目录访问时泄露物理路径
            },
          },
        ];
      },
    }),
  ],
  providers: [FileService, OssConfigService, LocalUploadService],
  exports: [FileService, OssConfigService, LocalUploadService],
})
export class FileManagementModule {}
