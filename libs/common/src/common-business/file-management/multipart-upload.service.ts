import { Injectable } from '@nestjs/common';
import { BizError } from '@thomas/nestjs/core/BizError';
import { FileService } from '@thomas/nestjs/core/nest/file-management/file.service';
import { S3StorageService } from '@thomas/nestjs/core/nest/s3-storage';
import type { ObjectCannedACL } from '@aws-sdk/client-s3';

const MIN_S3_MULTIPART_CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_S3_MULTIPART_PARTS = 10_000;

export interface MultipartUploadActor {
  identityType?: string;
  identityId?: string;
}

export interface InitMultipartUploadInput {
  ossConfigCode: string;
  key: string;
  hash: string;
  filename: string;
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
  acl?: ObjectCannedACL;
  mimeType?: string;
  suffix?: string;
  meta?: Record<string, unknown>;
  domain?: string;
  size?: string;
  chunkSize?: number;
}

export interface SignMultipartPartInput {
  ossConfigCode: string;
  key: string;
  uploadId: string;
  partNumber: number;
  contentLength?: number;
  expiresIn?: number;
}

export interface CompleteObjectCallbackInput {
  filename: string;
  object: string;
  ossConfigCode: string;
  hash?: string;
  suffix?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class MultipartUploadService {
  constructor(
    private readonly fileService: FileService,
    private readonly s3StorageService: S3StorageService,
  ) {}

  async initMultipart(
    input: InitMultipartUploadInput,
    actor: MultipartUploadActor = {},
  ) {
    if (!input.ossConfigCode) {
      throw new BizError('参数 ossConfigCode 不能为空').codeAs(400);
    }
    if (!input.hash) {
      throw new BizError('参数 hash 不能为空').codeAs(400);
    }
    if (!input.key) {
      throw new BizError('参数 key 不能为空').codeAs(400);
    }

    let file = await this.fileService.findByObjectHash(input.key, input.hash, {
      ossConfigCode: input.ossConfigCode,
      withDeleted: true,
    });

    const resolvedChunkSize =
      await this.s3StorageService.resolveMultipartChunkSize(
        input.ossConfigCode,
        input.chunkSize,
      );

    const isNew = !file;
    if (
      file?.createdBy &&
      actor.identityId &&
      file.createdBy !== actor.identityId
    ) {
      throw new BizError('无权续传其他用户的文件').codeAs(403);
    }
    let uploadId = file?.uploadId;
    const wasDeleted = !!file?.deletedAt;
    const shouldInitUpload = !uploadId || isNew || wasDeleted;
    const effectiveChunkSize =
      !isNew && !wasDeleted && file?.chunkSize
        ? file.chunkSize
        : resolvedChunkSize;
    const fileSize = Number(input.size);
    if (Number.isFinite(fileSize) && fileSize > effectiveChunkSize) {
      if (effectiveChunkSize < MIN_S3_MULTIPART_CHUNK_SIZE) {
        throw new BizError('S3 非末尾分片不能小于 5 MiB').codeAs(400);
      }
      if (Math.ceil(fileSize / effectiveChunkSize) > MAX_S3_MULTIPART_PARTS) {
        throw new BizError(
          `S3 分片数量不能超过 ${MAX_S3_MULTIPART_PARTS}`,
        ).codeAs(400);
      }
    }

    const baseUpdate = {
      filename: input.filename,
      mimeType: input.mimeType,
      suffix: input.suffix,
      meta: input.meta ?? file?.meta ?? {},
      object: input.key,
      hash: input.hash,
      domain: input.domain,
      storageType: 'oss' as const,
      ossConfigCode: input.ossConfigCode,
      size: input.size,
      chunkSize: effectiveChunkSize,
      completed: false,
    };

    let initPayload: { key: string; uploadId?: string; bucket?: string } = {
      key: input.key,
      uploadId,
    };
    if (shouldInitUpload) {
      initPayload = await this.s3StorageService.initMultipartUpload(input);
      uploadId = initPayload.uploadId;
    }

    if (!file) {
      file = await this.fileService.create(
        {
          ...baseUpdate,
          uploadId,
        },
        actor.identityType,
        actor.identityId,
      );
    }

    if (file && !isNew) {
      Object.assign(file, baseUpdate, {
        uploadId,
      });

      if (wasDeleted) {
        file.deletedAt = null;
      }

      if (actor.identityId) {
        file.updatedBy = actor.identityId;
      }

      file = await this.fileService.save(file);
    }

    let parts: { partNumber?: number; eTag?: string }[] = [];
    if (!isNew && !shouldInitUpload && uploadId) {
      parts = await this.listAllUploadParts({
        ossConfigCode: input.ossConfigCode,
        key: input.key,
        uploadId,
      });
    }

    return {
      upload: initPayload,
      file,
      chunkSize: effectiveChunkSize,
      parts,
    };
  }

  async signMultipartPart(input: SignMultipartPartInput) {
    if (!input.ossConfigCode) {
      throw new BizError('参数 ossConfigCode 不能为空').codeAs(400);
    }
    return await this.s3StorageService.generatePresignedUploadPartUrl(input);
  }

  async recordCompletedObject(
    input: CompleteObjectCallbackInput,
    actor: MultipartUploadActor = {},
  ) {
    if (!input.ossConfigCode || !input.object) {
      throw new BizError('ossConfigCode 和 object 不能为空').codeAs(400);
    }
    const objectMetadata = await this.s3StorageService.getObjectMetadata({
      ossConfigCode: input.ossConfigCode,
      key: input.object,
    });
    return await this.fileService.create(
      {
        filename: input.filename,
        mimeType: objectMetadata.contentType,
        suffix: input.suffix,
        meta: input.meta,
        object: input.object,
        hash: input.hash,
        fullUrl: objectMetadata.fullUrl,
        storageType: 'oss',
        ossConfigCode: input.ossConfigCode,
        size:
          objectMetadata.size == null ? undefined : `${objectMetadata.size}`,
        completed: true,
      },
      actor.identityType,
      actor.identityId,
    );
  }

  async completeMultipart(
    input: { fileId: string },
    actor: MultipartUploadActor = {},
  ) {
    if (!input.fileId) {
      throw new BizError('参数 fileId 不能为空').codeAs(400);
    }

    const file = await this.fileService.findById(input.fileId);
    this.assertUploadOwner(file.createdBy, actor.identityId);
    if (file.storageType !== 'oss') {
      throw new BizError('文件不是 OSS 存储类型').codeAs(400);
    }
    if (!file.ossConfigCode) {
      throw new BizError('文件缺少 ossConfigCode').codeAs(400);
    }
    if (!file.uploadId) {
      throw new BizError('文件缺少 uploadId').codeAs(400);
    }

    const parts = await this.listAllUploadParts({
      ossConfigCode: file.ossConfigCode,
      key: file.object,
      uploadId: file.uploadId,
    });

    const normalizedParts = parts.filter(
      (part): part is { partNumber: number; eTag: string } =>
        part.partNumber != null && !!part.eTag,
    );

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
    if (actor.identityId) {
      file.updatedBy = actor.identityId;
    }

    return await this.fileService.save(file);
  }

  async abortMultipart(
    input: { fileId: string },
    actor: MultipartUploadActor = {},
  ) {
    const file = await this.fileService.findById(input.fileId);
    this.assertUploadOwner(file.createdBy, actor.identityId);
    if (!file.ossConfigCode || !file.uploadId) {
      throw new BizError('文件没有可终止的 OSS 分片上传').codeAs(400);
    }
    await this.s3StorageService.abortMultipartUpload({
      ossConfigCode: file.ossConfigCode,
      key: file.object,
      uploadId: file.uploadId,
    });
    file.uploadId = undefined;
    file.completed = false;
    if (actor.identityId) {
      file.updatedBy = actor.identityId;
    }
    return await this.fileService.save(file);
  }

  private async listAllUploadParts(input: {
    ossConfigCode: string;
    key: string;
    uploadId: string;
  }) {
    const parts: { partNumber?: number; eTag?: string }[] = [];
    let marker: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const result = await this.s3StorageService.listUploadParts({
        ossConfigCode: input.ossConfigCode,
        key: input.key,
        uploadId: input.uploadId,
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

  private assertUploadOwner(createdBy?: string, identityId?: string) {
    if (createdBy && identityId && createdBy !== identityId) {
      throw new BizError('无权操作其他用户的上传任务').codeAs(403);
    }
  }
}
