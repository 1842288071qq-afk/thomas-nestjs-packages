import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { EnsureNotBlank } from '@qyy-code-lego/nestjs/core/nest/composition/ensure-not-blank.decorator';

export class CreateDeptDTO {
  @EnsureNotBlank({ message: '部门名称不能为空' })
  name: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderIndex?: number;
}

export class UpdateDeptDTO {
  @IsOptional()
  @EnsureNotBlank()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderIndex?: number;
}

export class DeptQueryDTO {
  @IsOptional()
  @EnsureNotBlank()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}

export class SimpleItemDTO {
  id: string;
  name: string;
}
