import { Injectable } from '@nestjs/common';
import { BizError } from '@thomas/nestjs/core/BizError';
import { ThreadLocal } from '@thomas/nestjs/core/nest/als/thread-local';
import { FileService } from '@thomas/nestjs/core/nest/file-management/file.service';
import { S3StorageService } from '@thomas/nestjs/core/nest/s3-storage';
import {
  OssMultipartCompleteDto,
  OssMultipartInitDto,
  OssMultipartSignPartDto,
} from './dto/oss-upload.dto';

@Injectable()
export class MultipartUploadService {
  constructor(
    private readonly fileService: FileService,
    private readonly s3StorageService: S3StorageService,
    private readonly threadLocal: ThreadLocal,
  ) {}

  async initMultipart(dto: OssMultipartInitDto) {
    if (!dto.ossConfigCode) {
      throw new BizError('参数 ossConfigCode 不能为空').codeAs(400);
    }
    if (!dto.hash) {
      throw new BizError('参数 hash 不能为空').codeAs(400);
    }
    if (!dto.key) {
      throw new BizError('参数 key 不能为空').codeAs(400);
    }

    const store = this.threadLocal.getStore();
    const identity = store?.identity;

    let file = await this.fileService.findByObjectHash(dto.key, dto.hash, {
      ossConfigCode: dto.ossConfigCode,
      withDeleted: true,
    });

    const resolvedChunkSize =
      await this.s3StorageService.resolveMultipartChunkSize(
        dto.ossConfigCode,
        dto.chunkSize,
      );

    const isNew = !file;
    let uploadId = file?.uploadId;
    const wasDeleted = !!file?.deletedAt;
    const shouldInitUpload = !uploadId || isNew || wasDeleted;
    const effectiveChunkSize =
      !isNew && !wasDeleted && file?.chunkSize
        ? file.chunkSize
        : resolvedChunkSize;

    const baseUpdate = {
      filename: dto.filename,
      mimeType: dto.mimeType,
      suffix: dto.suffix,
      meta: dto.meta ?? file?.meta ?? {},
      object: dto.key,
      hash: dto.hash,
      domain: dto.domain,
      storageType: 'oss' as const,
      ossConfigCode: dto.ossConfigCode,
      size: dto.size,
      chunkSize: effectiveChunkSize,
      completed: false,
    };

    let initPayload: { key: string; uploadId?: string; bucket?: string } = {
      key: dto.key,
      uploadId,
    };
    if (shouldInitUpload) {
      initPayload = await this.s3StorageService.initMultipartUpload(dto);
      uploadId = initPayload.uploadId;
    }

    if (!file) {
      file = await this.fileService.create(
        {
          ...baseUpdate,
          uploadId,
        },
        identity?.identityType,
        identity?.id,
      );
    }

    if (file && !isNew) {
      Object.assign(file, baseUpdate, {
        uploadId,
      });

      if (wasDeleted) {
        file.deletedAt = null;
      }

      if (identity?.id) {
        file.updatedBy = identity.id;
      }

      file = await this.fileService.save(file);
    }

    let parts: { partNumber?: number; eTag?: string }[] = [];
    if (!isNew && !shouldInitUpload && uploadId) {
      parts = await this.listAllUploadParts(
        dto.ossConfigCode,
        dto.key,
        uploadId,
      );
    }

    return {
      upload: initPayload,
      file,
      chunkSize: effectiveChunkSize,
      parts,
    };
  }

  async signMultipartPart(dto: OssMultipartSignPartDto) {
    if (!dto.ossConfigCode) {
      throw new BizError('参数 ossConfigCode 不能为空').codeAs(400);
    }
    return await this.s3StorageService.generatePresignedUploadPartUrl(dto);
  }

  async completeMultipart(dto: OssMultipartCompleteDto) {
    if (!dto.fileId) {
      throw new BizError('参数 fileId 不能为空').codeAs(400);
    }

    const store = this.threadLocal.getStore();
    const identity = store?.identity;

    const file = await this.fileService.findById(dto.fileId);
    if (file.storageType !== 'oss') {
      throw new BizError('文件不是 OSS 存储类型').codeAs(400);
    }
    if (!file.ossConfigCode) {
      throw new BizError('文件缺少 ossConfigCode').codeAs(400);
    }
    if (!file.uploadId) {
      throw new BizError('文件缺少 uploadId').codeAs(400);
    }

    const parts = await this.listAllUploadParts(
      file.ossConfigCode,
      file.object,
      file.uploadId,
    );

    const normalizedParts = parts
      .filter((part) => !!part.eTag && !!part.partNumber)
      .map((part) => ({
        partNumber: part.partNumber as number,
        eTag: part.eTag as string,
      }));

    if (normalizedParts.length === 0) {
      throw new BizError('未找到可合并的分片').codeAs(400);
    }

    const completeResult = await this.s3StorageService.completeMultipartUpload({
      ossConfigCode: file.ossConfigCode,
      key: file.object,
      uploadId: file.uploadId,
      parts: normalizedParts,
    });

    file.fullUrl = completeResult.fullUrl;
    file.completed = true;
    if (identity?.id) {
      file.updatedBy = identity.id;
    }

    return await this.fileService.save(file);
  }

  private async listAllUploadParts(
    ossConfigCode: string,
    key: string,
    uploadId: string,
  ) {
    const parts: { partNumber?: number; eTag?: string }[] = [];
    let marker: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const result = await this.s3StorageService.listUploadParts({
        ossConfigCode,
        key,
        uploadId,
        partNumberMarker: marker,
      });

      if (result.parts.length > 0) {
        parts.push(...result.parts);
      }

      hasMore = !!result.isTruncated;
      marker = result.nextPartNumberMarker;
    }

    return parts;
  }
}
