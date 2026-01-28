import { Transform, TransformOptions } from 'class-transformer';

export function Trim(options?: TransformOptions) {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return (value as string)?.trim();
  }, options);
}
