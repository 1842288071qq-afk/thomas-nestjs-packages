import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

export function parseBooleanGeneral(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
    const num = parseFloat(value);
    if (!isNaN(num)) return parseBooleanGeneral(num);
    throw new BadRequestException('Invalid boolean value');
  }
  if (typeof value === 'object') return true;
  return false;
}

export class ParseBoolGeneralPipe implements PipeTransform<unknown, boolean> {
  transform(value: unknown, _metadata: ArgumentMetadata): boolean {
    return parseBooleanGeneral(value);
  }
}
