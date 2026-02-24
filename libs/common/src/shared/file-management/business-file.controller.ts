import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LocalUploadService } from '@thomas/nestjs/core/nest/file-management/local-upload.service';
import { ApiResBody } from '@thomas/nestjs/core/ApiResBody';
import { BizError } from '@thomas/nestjs/core/BizError';
import { ThreadLocal } from '@thomas/nestjs/core/nest/als/thread-local';
import { IdentityRequired } from '../guards/identity-required/identity-required.decorator';
import { IdentityType } from '@thomas/nestjs/entities/core/identity/constants';
import { AvatarUploadDto } from './dto/business-file.dto';

/**
 * 业务相关的特定路径文件上传控制器
 * 主要是为了区分 object，只让客户端提供文件和文件名还有必要的定位标识即可。
 */
@IdentityRequired(IdentityType.OP_USER, IdentityType.User)
@Controller('business-files')
export class BusinessFileController {
  constructor(
    private readonly localUploadService: LocalUploadService,
    private readonly threadLocal: ThreadLocal,
  ) {}

  private getIdentityOrFail() {
    const store = this.threadLocal.getStore();
    const identity = store?.identity;
    if (!identity) {
      throw new BizError('没有身份信息，无法上传文件').codeAs(401);
    }
    return identity;
  }

  /**
   * khy和yypt账号的头像上传
   * 预设路径: /{username}/avatar/{filename}
   */
  @Post('upload/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AvatarUploadDto,
  ) {
    if (!file) throw new BizError('未检测到上传文件').codeAs(400);
    const identity = this.getIdentityOrFail();

    const object = `${dto.username}/avatar/${Date.now()}_${file.originalname}`;
    const record = await this.localUploadService.saveLocalFile(
      file,
      object,
      identity.identityType,
      identity.id,
    );
    return ApiResBody.of(record);
  }
}
