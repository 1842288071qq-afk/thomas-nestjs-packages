import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class AvatarUploadDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  username: string;
}

export class HospitalLogoUploadDto {
  @IsNotEmpty({ message: '社会信用代码不能为空' })
  @IsString()
  uscCode: string;
}

export class HospitalAttachmentUploadDto {
  @IsNotEmpty({ message: '社会信用代码不能为空' })
  @IsString()
  uscCode: string;

  @IsNotEmpty({ message: '附件类型不能为空' })
  @IsIn(['contract', 'trial', 'voucher'], {
    message: '类型必须是 contract, trial, voucher',
  })
  type: string;
}
