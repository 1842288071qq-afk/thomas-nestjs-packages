import { EnsureNotBlank } from '@qyy-code-lego/nestjs/core/nest/composition/ensure-not-blank.decorator';
import { IsString } from 'class-validator';

/**
 * ID查询 DTO (通用ID)
 */
export class IdQueryDTO {
  @EnsureNotBlank({ message: 'ID不能为空' })
  @IsString()
  id: string;
}
