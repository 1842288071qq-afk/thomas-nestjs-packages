import { Transform } from 'class-transformer';

/**
 * 转换逗号分隔的日期时间范围字符串为数组
 * 支持格式: "2025-01-01,2025-01-02" -> ["2025-01-01", "2025-01-02"]
 * 支持格式: ",2025-01-02" -> [null, "2025-01-02"]
 */
export function ParseDateTimeRange() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => {
        const trimmed = v.trim();
        return trimmed === '' ? null : trimmed;
      });
    }
    return value as (string | null)[];
  });
}
