import { Transform, Type } from 'class-transformer';

export class LoginFormDTO {
  @Type(() => String)
  @Transform(({ value }) => String(value).trim())
  username: string;
  @Type(() => String)
  @Transform(({ value }) => String(value).trim())
  password: string;
}

export interface LoginResultDTO {
  token: string;
}
