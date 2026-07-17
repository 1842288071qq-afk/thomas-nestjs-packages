import { Injectable } from '@nestjs/common';
import { BizError } from '@thomas/nestjs/core/BizError';
import { FileService } from '@thomas/nestjs/core/nest/file-management/file.service';
import { S3StorageService } from '@thomas/nestjs/core/nest/s3-storage';
import type { ObjectCannedACL } from '@aws-sdk/client-s3';
import { IdentityType } from '@thomas/nestjs/entities/core/identity/constants';

const MIN_S3_MULTIPART_CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_S3_MULTIPART_PARTS = 10_000;

export interface MultipartUploadActor {
  identityType?: string;
  identityId?: string;
}

export interface PrepareDirectUploadInput {
  ossConfigCode: string;
  key: string;
  filename: string;
  hash: string;
  size: string;
  contentMd5: string;
  contentType?: string;
  cacheControl?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  meta?: Record<string, unknown>;
  acl?: ObjectCannedACL;
  expiresIn?: number;
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
  size: string;
  chunkSize?: number;
}

export interface SignMultipartPartInput {
  fileId: string;
  partNumber: number;
  contentLength: number;
  contentMd5: string;
  expiresIn?: number;
}

export interface CompleteObjectCallbackInput {
  fileId: string;
}

@Injectable()
export class MultipartUploadService {
  constructor(
    private readonly fileService: FileService,
    private readonly s3StorageService: S3StorageService,
  ) {}

  async prepareDirectUpload(
    input: PrepareDirectUploadInput,
    actor: MultipartUploadActor,
  ) {
    this.assertAuthenticatedActor(actor);
    const expectedSize = this.parseFileSize(input.size, true);
    let file = await this.fileService.findOssByObject(
      input.key,
      input.ossConfigCode,
    );

    if (file) {
      this.assertUploadOwner(file.createdBy, actor);
      if (file.completed) {
        throw new BizError('该 OSS key 已有完成文件，请为新文件生成新 key')
          .codeAs(409)
          .httpStatusAs(409);
      }
      if (file.hash !== input.hash) {
        throw new BizError('该 OSS key 已被另一个文件的上传任务占用')
          .codeAs(409)
          .httpStatusAs(409);
      }
      Object.assign(file, {
        filename: input.filename,
        mimeType: input.contentType,
        suffix: this.getFileSuffix(input.filename),
        meta: input.meta ?? file.meta ?? {},
        size: `${expectedSize}`,
        updatedBy: actor.identityId,
      });
      file = await this.fileService.save(file);
    } else {
      try {
        file = await this.fileService.createOssUploadTask(
          {
            filename: input.filename,
            mimeType: input.contentType,
            suffix: this.getFileSuffix(input.filename),
            meta: input.meta ?? {},
            object: input.key,
            hash: input.hash,
            storageType: 'oss',
            ossConfigCode: input.ossConfigCode,
            size: `${expectedSize}`,
            completed: false,
          },
          actor.identityType,
          actor.identityId,
        );
      } catch (error) {
        this.rethrowOssKeyConflict(error);
      }
    }

    const signed = await this.s3StorageService.generatePresignedPutUrl({
      ...input,
      contentLength: expectedSize,
    });
    return { ...signed, file };
  }

  async signGet(
    input: {
      fileId: string;
      expiresIn?: number;
      responseContentType?: string;
      responseContentDisposition?: string;
    },
    actor: MultipartUploadActor,
  ) {
    this.assertAuthenticatedActor(actor);
    const file = await this.fileService.findById(input.fileId);
    this.assertUploadOwner(file.createdBy, actor);
    if (!file.completed || file.storageType !== 'oss' || !file.ossConfigCode) {
      throw new BizError('文件尚未完成 OSS 上传').codeAs(400);
    }
    return await this.s3StorageService.generatePresignedGetUrl({
      ossConfigCode: file.ossConfigCode,
      key: file.object,
      expiresIn: input.expiresIn,
      responseContentType: input.responseContentType,
      responseContentDisposition: input.responseContentDisposition,
    });
  }

  async initMultipart(
    input: InitMultipartUploadInput,
    actor: MultipartUploadActor,
  ) {
    this.assertAuthenticatedActor(actor);
    if (!input.ossConfigCode) {
      throw new BizError('参数 ossConfigCode 不能为空').codeAs(400);
    }
    if (!input.hash) {
      throw new BizError('参数 hash 不能为空').codeAs(400);
    }
    if (!input.key) {
      throw new BizError('参数 key 不能为空').codeAs(400);
    }

    const fileSize = this.parsePositiveFileSize(input.size);
    let file = await this.fileService.findOssByObject(
      input.key,
      input.ossConfigCode,
    );
    if (file) {
      this.assertUploadOwner(file.createdBy, actor);
      if (file.hash !== input.hash) {
        throw new BizError('该 OSS key 已被另一个文件的上传任务占用')
          .codeAs(409)
          .httpStatusAs(409);
      }
      if (file.completed) {
        throw new BizError('该 OSS key 已有完成文件，请为新文件生成新 key')
          .codeAs(409)
          .httpStatusAs(409);
      }
      if (file.size !== `${fileSize}`) {
        throw new BizError('续传文件大小与原上传任务不一致').codeAs(409);
      }
    }

    const resolvedChunkSize =
      await this.s3StorageService.resolveMultipartChunkSize(
        input.ossConfigCode,
        input.chunkSize,
      );

    const isNew = !file;
    let uploadId = file?.uploadId ?? undefined;
    const shouldInitUpload = !uploadId || isNew;
    const effectiveChunkSize =
      !isNew && file?.chunkSize ? file.chunkSize : resolvedChunkSize;
    if (fileSize > effectiveChunkSize) {
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
      size: `${fileSize}`,
      chunkSize: effectiveChunkSize,
      completed: false,
    };

    let initPayload: { key: string; uploadId?: string; bucket?: string } = {
      key: input.key,
      uploadId,
    };
    if (!file) {
      try {
        file = await this.fileService.createOssUploadTask(
          {
            ...baseUpdate,
            uploadId: undefined,
          },
          actor.identityType,
          actor.identityId,
        );
      } catch (error) {
        this.rethrowOssKeyConflict(error);
      }
    }

    if (shouldInitUpload) {
      initPayload = await this.s3StorageService.initMultipartUpload(input);
      uploadId = initPayload.uploadId;
    }

    Object.assign(file, baseUpdate, {
      uploadId,
    });
    file.updatedBy = actor.identityId;

    file = await this.fileService.save(file);

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

  async signMultipartPart(
    input: SignMultipartPartInput,
    actor: MultipartUploadActor,
  ) {
    this.assertAuthenticatedActor(actor);
    const file = await this.fileService.findById(input.fileId);
    this.assertUploadOwner(file.createdBy, actor);
    if (
      file.completed ||
      file.storageType !== 'oss' ||
      !file.ossConfigCode ||
      !file.uploadId ||
      !file.chunkSize ||
      !file.size
    ) {
      throw new BizError('文件没有可上传的 OSS 分片任务').codeAs(400);
    }

    const fileSize = this.parsePositiveFileSize(file.size);
    const totalParts = Math.ceil(fileSize / file.chunkSize);
    if (input.partNumber > totalParts) {
      throw new BizError('partNumber 超出文件分片范围').codeAs(400);
    }
    const expectedLength = this.getExpectedPartSize(
      fileSize,
      file.chunkSize,
      input.partNumber,
    );
    if (input.contentLength !== expectedLength) {
      throw new BizError('分片大小与上传任务不一致').codeAs(400);
    }

    return await this.s3StorageService.generatePresignedUploadPartUrl({
      ossConfigCode: file.ossConfigCode,
      key: file.object,
      uploadId: file.uploadId,
      partNumber: input.partNumber,
      contentLength: input.contentLength,
      contentMd5: input.contentMd5,
      expiresIn: input.expiresIn,
    });
  }

  async recordCompletedObject(
    input: CompleteObjectCallbackInput,
    actor: MultipartUploadActor,
  ) {
    this.assertAuthenticatedActor(actor);
    const file = await this.fileService.findById(input.fileId);
    this.assertUploadOwner(file.createdBy, actor);
    if (file.completed) return file;
    if (file.storageType !== 'oss' || !file.ossConfigCode || !file.size) {
      throw new BizError('文件没有待完成的 OSS 直传任务').codeAs(400);
    }
    const objectMetadata = await this.s3StorageService.getObjectMetadata({
      ossConfigCode: file.ossConfigCode,
      key: file.object,
    });
    const expectedSize = this.parseFileSize(file.size, true);
    if (objectMetadata.size !== expectedSize) {
      throw new BizError('OSS 对象大小与上传任务不一致').codeAs(400);
    }
    file.mimeType = objectMetadata.contentType;
    file.fullUrl = objectMetadata.fullUrl;
    file.size = `${objectMetadata.size}`;
    file.completed = true;
    file.updatedBy = actor.identityId;
    return await this.fileService.save(file);
  }

  async completeMultipart(
    input: { fileId: string },
    actor: MultipartUploadActor,
  ) {
    this.assertAuthenticatedActor(actor);
    if (!input.fileId) {
      throw new BizError('参数 fileId 不能为空').codeAs(400);
    }

    const file = await this.fileService.findById(input.fileId);
    this.assertUploadOwner(file.createdBy, actor);
    if (file.completed) return file;
    if (file.storageType !== 'oss') {
      throw new BizError('文件不是 OSS 存储类型').codeAs(400);
    }
    if (!file.ossConfigCode) {
      throw new BizError('文件缺少 ossConfigCode').codeAs(400);
    }
    if (!file.uploadId || !file.chunkSize || !file.size) {
      throw new BizError('文件缺少有效的分片上传信息').codeAs(400);
    }

    const parts = await this.listAllUploadParts({
      ossConfigCode: file.ossConfigCode,
      key: file.object,
      uploadId: file.uploadId,
    });

    const fileSize = this.parsePositiveFileSize(file.size);
    const expectedPartCount = Math.ceil(fileSize / file.chunkSize);
    const normalizedParts = this.validateCompletedParts(
      parts,
      fileSize,
      file.chunkSize,
      expectedPartCount,
    );

    const completeResult = await this.s3StorageService.completeMultipartUpload({
      ossConfigCode: file.ossConfigCode,
      key: file.object,
      uploadId: file.uploadId,
      parts: normalizedParts,
    });

    const objectMetadata = await this.s3StorageService.getObjectMetadata({
      ossConfigCode: file.ossConfigCode,
      key: file.object,
    });
    if (objectMetadata.size !== fileSize) {
      throw new BizError('合并后的 OSS 对象大小与上传任务不一致').codeAs(400);
    }

    file.fullUrl = objectMetadata.fullUrl ?? completeResult.fullUrl;
    file.mimeType = objectMetadata.contentType ?? file.mimeType;
    file.size = `${objectMetadata.size}`;
    file.uploadId = null;
    file.completed = true;
    file.updatedBy = actor.identityId;

    return await this.fileService.save(file);
  }

  async abortMultipart(input: { fileId: string }, actor: MultipartUploadActor) {
    this.assertAuthenticatedActor(actor);
    const file = await this.fileService.findById(input.fileId);
    this.assertUploadOwner(file.createdBy, actor);
    if (file.completed) {
      throw new BizError('已完成的文件不能终止分片上传').codeAs(400);
    }
    if (!file.ossConfigCode || !file.uploadId) {
      throw new BizError('文件没有可终止的 OSS 分片上传').codeAs(400);
    }
    await this.s3StorageService.abortMultipartUpload({
      ossConfigCode: file.ossConfigCode,
      key: file.object,
      uploadId: file.uploadId,
    });
    file.uploadId = null;
    file.completed = false;
    file.updatedBy = actor.identityId;
    return await this.fileService.save(file);
  }

  private async listAllUploadParts(input: {
    ossConfigCode: string;
    key: string;
    uploadId: string;
  }) {
    const parts: { partNumber?: number; eTag?: string; size?: number }[] = [];
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

  private parsePositiveFileSize(size: string) {
    return this.parseFileSize(size, false);
  }

  private parseFileSize(size: string, allowZero: boolean) {
    const pattern = allowZero ? /^(0|[1-9]\d*)$/ : /^[1-9]\d*$/;
    if (!pattern.test(size)) {
      throw new BizError(
        allowZero ? '文件大小必须为非负整数' : '文件大小必须为正整数',
      ).codeAs(400);
    }
    const parsed = Number(size);
    if (
      !Number.isSafeInteger(parsed) ||
      parsed < 0 ||
      (!allowZero && parsed === 0)
    ) {
      throw new BizError('文件大小超出支持范围').codeAs(400);
    }
    return parsed;
  }

  private getExpectedPartSize(
    fileSize: number,
    chunkSize: number,
    partNumber: number,
  ) {
    const start = (partNumber - 1) * chunkSize;
    return Math.min(chunkSize, fileSize - start);
  }

  private validateCompletedParts(
    parts: { partNumber?: number; eTag?: string; size?: number }[],
    fileSize: number,
    chunkSize: number,
    expectedPartCount: number,
  ) {
    const normalized = parts
      .filter(
        (part): part is { partNumber: number; eTag: string; size: number } =>
          part.partNumber != null && !!part.eTag && part.size != null,
      )
      .sort((left, right) => left.partNumber - right.partNumber);
    if (normalized.length !== expectedPartCount) {
      throw new BizError(
        `分片数量不完整，预期 ${expectedPartCount} 个，实际 ${normalized.length} 个`,
      ).codeAs(400);
    }
    normalized.forEach((part, index) => {
      const expectedPartNumber = index + 1;
      const expectedSize = this.getExpectedPartSize(
        fileSize,
        chunkSize,
        expectedPartNumber,
      );
      if (
        part.partNumber !== expectedPartNumber ||
        part.size !== expectedSize
      ) {
        throw new BizError(`第 ${expectedPartNumber} 个分片不完整`).codeAs(400);
      }
    });
    return normalized;
  }

  private getFileSuffix(filename: string) {
    const dotIndex = filename.lastIndexOf('.');
    return dotIndex > -1 ? filename.slice(dotIndex + 1) : undefined;
  }

  private rethrowOssKeyConflict(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      throw new BizError('该 OSS key 已被其他上传任务占用')
        .codeAs(409)
        .httpStatusAs(409);
    }
    throw error;
  }
}
