import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * 医院ID查询 DTO
 */
export class HospitalIdQueryDTO {
  @IsNotEmpty({ message: '医院ID不能为空' })
  @IsString()
  hospitalId: string;
}

/**
 * 医院ID查询 DTO (可选)
 */
export class OptionalHospitalIdQueryDTO {
  @IsOptional()
  @IsString()
  hospitalId?: string;
}

/**
 * ID查询 DTO (通用ID)
 */
export class IdQueryDTO {
  @IsNotEmpty({ message: 'ID不能为空' })
  @IsString()
  id: string;
}
