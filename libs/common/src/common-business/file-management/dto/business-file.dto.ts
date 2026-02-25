import { IsNotEmpty, IsString } from 'class-validator';

export class AvatarUploadDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  username: string;
}
