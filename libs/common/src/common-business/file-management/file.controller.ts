import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from '@thomas/nestjs/core/nest/file-management/file.service';
import { LocalUploadService } from '@thomas/nestjs/core/nest/file-management/local-upload.service';
import { ApiResBody } from '@thomas/nestjs/core/ApiResBody';
import { BizError } from '@thomas/nestjs/core/BizError';
import { ThreadLocal } from '@thomas/nestjs/core/nest/als/thread-local';
import { IdentityRequired } from '../../shared/guards/identity-required/identity-required.decorator';
import { ParseCsvArrayPipe } from '@thomas/nestjs/core/nest/transform/ParseCsvArray.pipe';
import { IdentityType } from '@thomas/nestjs/entities/core/identity/constants';
import {
  OssMultipartCompleteDto,
  OssMultipartAbortDto,
  OssGetSignDto,
  OssMultipartInitDto,
  OssMultipartSignPartDto,
  OssPutSignDto,
  OssUploadCallbackDto,
} from './dto/oss-upload.dto';
import { MultipartUploadService } from './multipart-upload.service';
import {
  LocalMultipartAbortDto,
  LocalMultipartCompleteDto,
  LocalMultipartInitDto,
  LocalMultipartPartDto,
} from './dto/local-upload.dto';
import { LocalMultipartUploadService } from './local-multipart-upload.service';

@IdentityRequired(IdentityType.OP_USER, IdentityType.User)
@Controller('files')
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly localUploadService: LocalUploadService,
    private readonly localMultipartUploadService: LocalMultipartUploadService,
    private readonly multipartUploadService: MultipartUploadService,
    private readonly threadLocal: ThreadLocal,
  ) {}

  // --- 本地上传 ---
  @Post('upload/local')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLocal(
    @UploadedFile() file: Express.Multer.File,
    @Body('object') object: string,
  ) {
    if (!object) {
      throw new BizError('参数 object 不能为空').codeAs(400);
    }
    const store = this.threadLocal.getStore();
    const identity = store?.identity;
    // 没有identity不能访问
    if (!identity) {
      throw new BizError('没有身份信息，无法上传文件').codeAs(401);
    }

    const record = await this.localUploadService.saveLocalFile(
      file,
      object,
      identity?.identityType,
      identity?.id,
    );
    return ApiResBody.of(record);
  }

  // --- 初始化或恢复本地分片上传 ---
  @Post('local/multipart/init')
  async initLocalMultipart(@Body() dto: LocalMultipartInitDto) {
    const result = await this.localMultipartUploadService.initMultipart(
      dto,
      this.getUploadActor(),
    );
    return ApiResBody.of(result);
  }

  // --- 上传单个本地分片 ---
  @Post('local/multipart/part')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLocalMultipartPart(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: LocalMultipartPartDto,
  ) {
    if (!file) {
      throw new BizError('参数 file 不能为空').codeAs(400);
    }
    const result = await this.localMultipartUploadService.uploadPart(
      { ...dto, file },
      this.getUploadActor(),
    );
    return ApiResBody.of(result);
  }

  // --- 合并本地分片并完成文件记录 ---
  @Post('local/multipart/complete')
  async completeLocalMultipart(@Body() dto: LocalMultipartCompleteDto) {
    const result = await this.localMultipartUploadService.completeMultipart(
      dto,
      this.getUploadActor(),
    );
    return ApiResBody.of(result);
  }

  // --- 中止本地分片上传并清理临时文件 ---
  @Post('local/multipart/abort')
  async abortLocalMultipart(@Body() dto: LocalMultipartAbortDto) {
    const result = await this.localMultipartUploadService.abortMultipart(
      dto,
      this.getUploadActor(),
    );
    return ApiResBody.of(result);
  }

  // --- OSS 上传后的记录创建 (由客户端通知) ---
  @Post('oss/callback')
  async ossCallback(@Body() dto: OssUploadCallbackDto) {
    const store = this.threadLocal.getStore();
    const identity = store?.identity;

    const record = await this.multipartUploadService.recordCompletedObject(
      dto,
      {
        identityType: identity?.identityType,
        identityId: identity?.id,
      },
    );
    return ApiResBody.of(record);
  }

  // --- 获取 OSS PUT 直传签名 ---
  @Post('oss/sign/put')
  async signPut(@Body() dto: OssPutSignDto) {
    const signed = await this.multipartUploadService.prepareDirectUpload(
      dto,
      this.getUploadActor(),
    );
    return ApiResBody.of(signed);
  }

  // --- 获取 OSS 对象访问签名 ---
  @Post('oss/sign/get')
  async signGet(@Body() dto: OssGetSignDto) {
    const signed = await this.multipartUploadService.signGet(
      dto,
      this.getUploadActor(),
    );
    return ApiResBody.of(signed);
  }

  // --- 初始化 OSS 分片上传 ---
  @Post('oss/multipart/init')
  async initMultipart(@Body() dto: OssMultipartInitDto) {
    const result = await this.multipartUploadService.initMultipart(
      dto,
      this.getUploadActor(),
    );
    return ApiResBody.of(result);
  }

  // --- 获取 OSS 分片上传签名 ---
  @Post('oss/multipart/sign-part')
  async signMultipartPart(@Body() dto: OssMultipartSignPartDto) {
    const signedPart = await this.multipartUploadService.signMultipartPart(
      dto,
      this.getUploadActor(),
    );
    return ApiResBody.of(signedPart);
  }

  // --- 完成 OSS 分片上传并创建文件映射 ---
  @Post('oss/multipart/complete')
  async completeMultipart(@Body() dto: OssMultipartCompleteDto) {
    const saved = await this.multipartUploadService.completeMultipart(
      dto,
      this.getUploadActor(),
    );
    return ApiResBody.of(saved);
  }

  // --- 主动终止 OSS 分片上传 ---
  @Post('oss/multipart/abort')
  async abortMultipart(@Body() dto: OssMultipartAbortDto) {
    const saved = await this.multipartUploadService.abortMultipart(
      dto,
      this.getUploadActor(),
    );
    return ApiResBody.of(saved);
  }

  // --- 文件 ID 翻译 ---
  @Get('translate')
  async translate(@Query('ids', ParseCsvArrayPipe) ids: string[]) {
    if (!ids || ids.length === 0) {
      return ApiResBody.of([]);
    }
    const result = await this.fileService.translateIds(ids);
    return ApiResBody.of(result);
  }

  private getUploadActor() {
    const identity = this.threadLocal.getStore()?.identity;
    return {
      identityType: identity?.identityType,
      identityId: identity?.id,
    };
  }
}
