import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiResBody } from '@thomas/nestjs/core/ApiResBody';
import { IdentityRequired } from '../../shared/guards/identity-required/identity-required.decorator';
import { IdentityType } from '@thomas/nestjs/entities/core/identity/constants';
import { AvatarUploadDto } from './dto/business-file.dto';
import { AccountAvatarService } from './account-avatar.service';

/**
 * 业务相关的特定路径文件上传控制器
 * 主要是为了区分 object，只让客户端提供文件和文件名还有必要的定位标识即可。
 */
@IdentityRequired(IdentityType.OP_USER, IdentityType.User)
@Controller('business-files')
export class BusinessFileController {
  constructor(private readonly accountAvatarService: AccountAvatarService) {}

  /**
   * 账号的头像上传
   * 预设路径: /{username}/avatar/{filename}
   */
  @Post('upload/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AvatarUploadDto,
  ) {
    const record = await this.accountAvatarService.uploadAvatar(file, dto);
    return ApiResBody.of(record);
  }
}
