import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BizError } from '@qyy-code-lego/nestjs/core/BizError';
import { FileService } from '@qyy-code-lego/nestjs/core/nest/file-management/file.service';
import { IdentityType } from '@qyy-code-lego/nestjs/entities/core/identity/constants';
import type { SysFileEntity } from '@qyy-code-lego/nestjs/entities/core/sys/sys-file.entity';
import fs from 'fs-extra';
import type { MultipartUploadActor } from './multipart-upload.service';

const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024;
const MAX_PARTS = 10_000;

export interface LocalMultipartInitInput {
  key: string;
  hash: string;
  filename: string;
  mimeType?: string;
  suffix?: string;
  meta?: Record<string, unknown>;
  size: string;
  chunkSize?: number;
}

@Injectable()
export class LocalMultipartUploadService {
  private readonly storageRoot: string;
  private readonly tempRoot: string;
  private readonly serveRoot: string;
  private readonly defaultChunkSize: number;

  constructor(
    configService: ConfigService,
    private readonly fileService: FileService,
  ) {
    this.storageRoot = path.resolve(
      configService.get<string>('file.local.storageRoot', './uploads'),
    );
    this.tempRoot = path.resolve(
      configService.get<string>(
        'file.local.multipartTempRoot',
        path.join(this.storageRoot, '.multipart'),
      ),
    );
    this.serveRoot = configService.get<string>(
      'file.local.serveRoot',
      '/files',
    );
    this.defaultChunkSize = this.parsePositiveInteger(
      configService.get<number>(
        'file.local.multipartChunkSize',
        DEFAULT_CHUNK_SIZE,
      ),
      '本地默认分片大小',
    );
  }

  async initMultipart(
    input: LocalMultipartInitInput,
    actor: MultipartUploadActor,
  ) {
    this.assertAuthenticatedActor(actor);
    const size = this.parsePositiveInteger(input.size, '文件大小');
    const chunkSize = this.parsePositiveInteger(
      input.chunkSize ?? this.defaultChunkSize,
      '分片大小',
    );
    if (Math.ceil(size / chunkSize) > MAX_PARTS) {
      throw new BizError(`本地分片数量不能超过 ${MAX_PARTS}`).codeAs(400);
    }
    this.resolveObjectPath(input.key);

    let file = await this.fileService.findLocalByObject(input.key);
    if (file) {
      this.assertUploadOwner(file.createdBy, actor);
      if (file.completed) {
        throw new BizError('该本地 object 已有完成文件，请生成新 object')
          .codeAs(409)
          .httpStatusAs(409);
      }
      if (file.hash !== input.hash || file.size !== `${size}`) {
        throw new BizError('该本地 object 已被另一个上传任务占用')
          .codeAs(409)
          .httpStatusAs(409);
      }
    }

    const uploadId = file?.uploadId ?? randomUUID();
    const effectiveChunkSize = file?.chunkSize ?? chunkSize;
    const payload = {
      filename: input.filename,
      mimeType: input.mimeType,
      suffix: input.suffix ?? this.getSuffix(input.filename),
      meta: input.meta ?? file?.meta ?? {},
      object: input.key,
      hash: input.hash,
      storageType: 'local' as const,
      uploadId,
      chunkSize: effectiveChunkSize,
      completed: false,
      size: `${size}`,
    };
    if (!file) {
      file = await this.fileService.createLocalUploadTask(
        payload,
        actor.identityType,
        actor.identityId,
      );
    } else {
      Object.assign(file, payload, { updatedBy: actor.identityId });
      file = await this.fileService.save(file);
    }
    await fs.ensureDir(this.getPartDir(file));
    return {
      upload: { uploadId, key: input.key },
      file,
      chunkSize: effectiveChunkSize,
      parts: await this.listParts(file),
    };
  }

  async uploadPart(
    input: {
      fileId: string;
      partNumber: number;
      contentMd5: string;
      file: Express.Multer.File;
    },
    actor: MultipartUploadActor,
  ) {
    const file = await this.getActiveTask(input.fileId, actor);
    const { totalParts, expectedSize } = this.getPartExpectation(
      file,
      input.partNumber,
    );
    if (input.file.size !== expectedSize) {
      throw new BizError('本地分片大小与上传任务不一致').codeAs(400);
    }
    const actualMd5 = createHash('md5')
      .update(input.file.buffer)
      .digest('base64');
    if (actualMd5 !== input.contentMd5) {
      throw new BizError('本地分片 MD5 校验失败').codeAs(400);
    }
    const partPath = this.getPartPath(file, input.partNumber);
    await fs.ensureDir(path.dirname(partPath));
    const tempPath = `${partPath}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(tempPath, input.file.buffer);
      await this.assertUploadStillActive(file.id, file.uploadId!);
      await fs.move(tempPath, partPath, { overwrite: true });
      await this.assertUploadStillActive(file.id, file.uploadId!);
    } catch (error) {
      await fs.remove(tempPath);
      await fs.remove(partPath);
      throw error;
    }
    return {
      partNumber: input.partNumber,
      eTag: actualMd5,
      size: input.file.size,
      totalParts,
    };
  }

  async completeMultipart(
    input: { fileId: string },
    actor: MultipartUploadActor,
  ) {
    const file = await this.getActiveTask(input.fileId, actor);
    const size = this.parsePositiveInteger(file.size, '文件大小');
    const chunkSize = this.parsePositiveInteger(file.chunkSize, '分片大小');
    const totalParts = Math.ceil(size / chunkSize);
    const parts = await this.listParts(file);
    if (parts.length !== totalParts) {
      throw new BizError('本地分片数量不完整').codeAs(400);
    }
    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      const expected = this.getPartExpectation(file, partNumber).expectedSize;
      const part = parts.find((item) => item.partNumber === partNumber);
      if (!part || part.size !== expected) {
        throw new BizError(`本地分片 ${partNumber} 不完整`).codeAs(400);
      }
    }

    const targetPath = this.resolveObjectPath(file.object);
    await fs.ensureDir(path.dirname(targetPath));
    const uploadId = file.uploadId!;
    const assembledPath = `${targetPath}.${uploadId}.assembling`;
    try {
      const output = await open(assembledPath, 'w');
      try {
        let position = 0;
        for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
          for await (const chunk of createReadStream(
            this.getPartPath(file, partNumber),
          )) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            await output.write(buffer, 0, buffer.length, position);
            position += buffer.length;
          }
        }
        if (position !== size) {
          throw new BizError('本地分片合并后大小不一致').codeAs(400);
        }
      } finally {
        await output.close();
      }
      await fs.move(assembledPath, targetPath, { overwrite: true });
    } catch (error) {
      await fs.remove(assembledPath);
      throw error;
    }
    file.fullUrl = `${this.serveRoot.replace(/\/$/, '')}/${file.object}`;
    file.uploadId = null;
    file.completed = true;
    file.updatedBy = actor.identityId;
    const saved = await this.fileService.save(file);
    await fs.remove(this.getPartDirByIds(file.id, uploadId));
    await fs.remove(path.join(this.tempRoot, file.id));
    return saved;
  }

  async abortMultipart(input: { fileId: string }, actor: MultipartUploadActor) {
    const file = await this.getActiveTask(input.fileId, actor);
    const partDir = this.getPartDir(file);
    file.uploadId = null;
    file.updatedBy = actor.identityId;
    const saved = await this.fileService.save(file);
    await fs.remove(partDir);
    await fs.remove(path.dirname(partDir));
    return saved;
  }

  private async getActiveTask(fileId: string, actor: MultipartUploadActor) {
    this.assertAuthenticatedActor(actor);
    const file = await this.fileService.findById(fileId);
    this.assertUploadOwner(file.createdBy, actor);
    if (
      file.storageType !== 'local' ||
      file.completed ||
      !file.uploadId ||
      !file.chunkSize ||
      !file.size
    ) {
      throw new BizError('文件没有可操作的本地分片任务').codeAs(400);
    }
    return file;
  }

  private async listParts(file: SysFileEntity) {
    const dir = this.getPartDir(file);
    if (!(await fs.pathExists(dir))) return [];
    const names = await fs.readdir(dir);
    const parts: Array<{ partNumber: number; size: number }> = [];
    for (const name of names) {
      const match = /^part-(\d{5})$/.exec(name);
      if (!match) continue;
      const stat = await fs.stat(path.join(dir, name));
      if (stat.isFile()) {
        parts.push({ partNumber: Number(match[1]), size: stat.size });
      }
    }
    return parts.sort((a, b) => a.partNumber - b.partNumber);
  }

  private async assertUploadStillActive(fileId: string, uploadId: string) {
    const latest = await this.fileService.findById(fileId);
    if (
      latest.storageType !== 'local' ||
      latest.completed ||
      latest.uploadId !== uploadId
    ) {
      throw new BizError('本地分片任务已经结束').codeAs(409);
    }
  }

  private getPartExpectation(file: SysFileEntity, partNumber: number) {
    const size = this.parsePositiveInteger(file.size, '文件大小');
    const chunkSize = this.parsePositiveInteger(file.chunkSize, '分片大小');
    const totalParts = Math.ceil(size / chunkSize);
    if (
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > totalParts
    ) {
      throw new BizError('partNumber 超出文件分片范围').codeAs(400);
    }
    return {
      totalParts,
      expectedSize: Math.min(chunkSize, size - (partNumber - 1) * chunkSize),
    };
  }

  private getPartDir(file: SysFileEntity) {
    return this.getPartDirByIds(file.id, file.uploadId!);
  }

  private getPartDirByIds(fileId: string, uploadId: string) {
    return path.join(this.tempRoot, fileId, uploadId);
  }

  private getPartPath(file: SysFileEntity, partNumber: number) {
    return path.join(
      this.getPartDir(file),
      `part-${`${partNumber}`.padStart(5, '0')}`,
    );
  }

  private resolveObjectPath(object: string) {
    const resolved = path.resolve(this.storageRoot, object);
    if (
      !object ||
      path.isAbsolute(object) ||
      !resolved.startsWith(`${this.storageRoot}${path.sep}`)
    ) {
      throw new BizError('本地 object 必须是安全的相对路径').codeAs(400);
    }
    return resolved;
  }

  private parsePositiveInteger(value: unknown, name: string) {
    const parsed = typeof value === 'string' ? Number(value) : value;
    if (
      typeof parsed !== 'number' ||
      !Number.isSafeInteger(parsed) ||
      parsed <= 0
    ) {
      throw new BizError(`${name}必须是正整数`).codeAs(400);
    }
    return parsed;
  }

  private getSuffix(filename: string) {
    const suffix = path.extname(filename).slice(1).toLowerCase();
    return suffix || undefined;
  }

  private assertAuthenticatedActor(
    actor: MultipartUploadActor,
  ): asserts actor is Required<MultipartUploadActor> {
    if (!actor.identityId || !actor.identityType) {
      throw new BizError('没有身份信息，无法操作上传任务').codeAs(401);
    }
  }

  private assertUploadOwner(
    createdBy: string | undefined,
    actor: MultipartUploadActor,
  ) {
    if (
      actor.identityType !== IdentityType.OP_USER &&
      (!createdBy || createdBy !== actor.identityId)
    ) {
      throw new BizError('无权操作其他用户的上传任务').codeAs(403);
    }
  }
}
