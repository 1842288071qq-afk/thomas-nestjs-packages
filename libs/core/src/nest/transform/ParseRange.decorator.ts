import { Transform } from 'class-transformer';

/**
 * 转换逗号分隔的数字范围字符串为数组
 * 支持格式: "1,100" -> [1, 100], ",100" -> [null, 100], "1," -> [1, null]
 */
export function ParseRange() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => {
        const trimmed = v.trim();
        if (trimmed === '') return null;
        const num = Number(trimmed);
        return isNaN(num) ? null : num;
      });
    }
    return value as (number | null)[];
  });
}
