import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsString, ValidationOptions } from 'class-validator';
import { Trim } from '@qyy-code-lego/nestjs/core/nest/transform/trim.decorator';

export function EnsureNotBlank(validationOptions?: ValidationOptions) {
  return applyDecorators(
    Trim(),
    IsString(validationOptions),
    IsNotEmpty(validationOptions),
  );
}
