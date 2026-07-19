import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileService } from './file.service';
import * as path from 'path';
import * as fs from 'fs-extra';
import { SysFileEntity } from '@thomas/nestjs/entities/core/sys/sys-file.entity';
import { BizError } from '@thomas/nestjs/core/BizError';

@Injectable()
export class LocalUploadService {
  private readonly storageRoot: string;
  private readonly serveRoot: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly fileService: FileService,
  ) {
    this.storageRoot = path.resolve(
      this.configService.get<string>('file.local.storageRoot', './uploads'),
    );
    this.serveRoot = this.configService.get<string>(
      'file.local.serveRoot',
      '/files',
    );
    fs.ensureDirSync(this.storageRoot);
  }

  async saveLocalFile(
    file: Express.Multer.File,
    object: string,
    authorType?: string,
    createdBy?: string,
  ): Promise<SysFileEntity> {
    if (!file) {
      throw new BizError('请选择要上传的文件').codeAs(400);
    }
    const targetPath = path.resolve(this.storageRoot, object);
    if (
      !object ||
      path.isAbsolute(object) ||
      !targetPath.startsWith(`${this.storageRoot}${path.sep}`)
    ) {
      throw new BizError('本地 object 必须是安全的相对路径').codeAs(400);
    }
    const targetDir = path.dirname(targetPath);
    await fs.ensureDir(targetDir);

    try {
      await fs.writeFile(targetPath, file.buffer);
    } catch (err: unknown) {
      throw new BizError(`文件写入失败: ${(err as Error).message}`).codeAs(500);
    }

    const suffix = path.extname(object).toLowerCase().replace('.', '');
    const filename = path.basename(object);

    return await this.fileService.create(
      {
        filename: filename || file.originalname,
        mimeType: file.mimetype,
        suffix: suffix,
        object: object,
        completed: true,
        storageType: 'local',
        fullUrl: `${this.serveRoot.replace(/\/$/, '')}/${object}`,
        size: file.size.toString(),
        meta: {},
      },
      authorType,
      createdBy,
    );
  }
}
