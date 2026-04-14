import { Transform } from 'class-transformer';

/**
 * 转换逗号分隔的日期时间范围字符串为数组
 * 支持格式: "2025-01-01,2025-01-02" -> [Date, Date]
 * 支持格式: ",2025-01-02" -> [null, Date]
 */
export function ParseDateTimeRange() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => {
        const trimmed = v.trim();
        if (trimmed === '') {
          return null;
        }

        const date = new Date(trimmed);
        return Number.isNaN(date.getTime()) ? null : date;
      });
    }

    if (Array.isArray(value)) {
      return value.map((item) => {
        if (item === null || item === undefined || item === '') {
          return null;
        }
        if (item instanceof Date) {
          return Number.isNaN(item.getTime()) ? null : item;
        }

        const date = new Date(String(item));
        return Number.isNaN(date.getTime()) ? null : date;
      });
    }

    return value as (Date | null)[];
  });
}
