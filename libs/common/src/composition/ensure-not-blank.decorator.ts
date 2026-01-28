import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString, ValidationOptions } from 'class-validator';
import { Trim } from '@app/core/nest/transform/trim.decorator';

export function EnsureNotBlank(validationOptions?: ValidationOptions) {
  return applyDecorators(
    Trim(),
    IsString(validationOptions),
    IsNotEmpty(validationOptions),
  );
}
