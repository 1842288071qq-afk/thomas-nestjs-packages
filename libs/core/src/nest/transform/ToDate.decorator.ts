import { Transform, TransformOptions } from 'class-transformer';
import { parseDate } from './ParseDateGeneral.pipe';

/**
 * 将输入转换为 Date 对象
 * 统一使用 parseDate 函数进行解析
 */
export function ToDate(options?: TransformOptions) {
  return Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined || value === '') {
      return value;
    }

    try {
      return parseDate(value);
    } catch (_e) {
      // 保持原始值，让后续的 class-validator (@IsDate) 进行处理
      return value;
    }
  }, options);
}
