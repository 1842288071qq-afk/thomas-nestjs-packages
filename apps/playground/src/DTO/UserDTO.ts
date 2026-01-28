import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsObject,
  ValidateNested,
} from 'class-validator';

export class MetaData {
  @IsNotEmpty({ message: 'a不能为空' })
  @Transform(({ value }) => {
    return String(value).trim();
  })
  a: string;

  @IsNotEmpty({ message: 'b不能为空' })
  @Transform(({ value }) => {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error('转换b出错');
    }
    return num;
  })
  b: number;

  @Transform(({ value }) => Boolean(value)) // 这个是指定转换，在类型转换完成后，对该实例的值进行进一步的自定义操作
  c: boolean;
}

export class UserDTO {
  @IsDefined({ message: '表单不能为空' })
  @IsNotEmpty({ message: 'name不能为空' })
  @Transform(({ value }) => (value as string).trim())
  name: string;
  age: number;
  @IsObject({ message: 'metaDataJson必须是对象' })
  @ValidateNested({ message: 'metaDataJson格式不正确' })
  @Type(() => MetaData)
  metaDataJson?: MetaData;
  metaDataText?: string[];
  // @Type(() => Boolean) // 这个是transform的指定类型转换，确保该属性是一个自定义类实例
  happy: boolean;
  @IsNotEmpty({ message: 'address不能为空' })
  address: string;
}

export class UpdateUserDTO extends PartialType(UserDTO) {}
