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
import { S3StorageService } from '@thomas/nestjs/core/nest/s3-storage';
import { CreateFileDto } from '@thomas/nestjs/core/nest/file-management/dto/file.dto';
import { ApiResBody } from '@thomas/nestjs/core/ApiResBody';
import { BizError } from '@thomas/nestjs/core/BizError';
import { ThreadLocal } from '@thomas/nestjs/core/nest/als/thread-local';
import { IdentityRequired } from '../../shared/guards/identity-required/identity-required.decorator';
import { ParseCsvArrayPipe } from '@thomas/nestjs/core/nest/transform/ParseCsvArray.pipe';
import { IdentityType } from '@thomas/nestjs/entities/core/identity/constants';
import {
  OssMultipartCompleteDto,
  OssMultipartInitDto,
  OssMultipartSignPartDto,
  OssPutSignDto,
} from './dto/oss-upload.dto';
import { MultipartUploadService } from './multipart-upload.service';

@IdentityRequired(IdentityType.OP_USER)
@Controller('files')
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly localUploadService: LocalUploadService,
    private readonly s3StorageService: S3StorageService,
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

  // --- OSS 上传后的记录创建 (由客户端通知) ---
  @Post('oss/callback')
  async ossCallback(@Body() dto: CreateFileDto) {
    const store = this.threadLocal.getStore();
    const identity = store?.identity;

    dto.completed = true;

    const record = await this.fileService.create(
      dto,
      identity?.identityType,
      identity?.id,
    );
    return ApiResBody.of(record);
  }

  // --- 获取 OSS PUT 直传签名 ---
  @Post('oss/sign/put')
  async signPut(@Body() dto: OssPutSignDto) {
    if (!dto.ossConfigCode) {
      throw new BizError('参数 ossConfigCode 不能为空').codeAs(400);
    }
    const signed = await this.s3StorageService.generatePresignedPutUrl(dto);
    return ApiResBody.of(signed);
  }

  // --- 初始化 OSS 分片上传 ---
  @Post('oss/multipart/init')
  async initMultipart(@Body() dto: OssMultipartInitDto) {
    const result = await this.multipartUploadService.initMultipart(dto);
    return ApiResBody.of(result);
  }

  // --- 获取 OSS 分片上传签名 ---
  @Post('oss/multipart/sign-part')
  async signMultipartPart(@Body() dto: OssMultipartSignPartDto) {
    const signedPart = await this.multipartUploadService.signMultipartPart(dto);
    return ApiResBody.of(signedPart);
  }

  // --- 完成 OSS 分片上传并创建文件映射 ---
  @Post('oss/multipart/complete')
  async completeMultipart(@Body() dto: OssMultipartCompleteDto) {
    const saved = await this.multipartUploadService.completeMultipart(dto);
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
}
