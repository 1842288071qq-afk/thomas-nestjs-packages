import { Transform, TransformOptions } from 'class-transformer';
import { parseCsvArray } from './ParseCsvArray.pipe';

/**
 * 将输入转换为字符串数组
 * 逻辑复用 parseCsvArray 函数
 */
export function ParseCsvArray(options?: TransformOptions) {
  return Transform(({ value }: { value: unknown }) => {
    return parseCsvArray(value);
  }, options);
}
