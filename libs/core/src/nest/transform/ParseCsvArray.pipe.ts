import { PipeTransform, Injectable } from '@nestjs/common';

/**
 * 将逗号分隔的字符串转换为数组
 * 示例: "a,b,c" -> ["a", "b", "c"]
 */
export function parseCsvArray(value: any): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => !!item);
  }
  return Array.isArray(value) ? (value as string[]) : [];
}

@Injectable()
export class ParseCsvArrayPipe implements PipeTransform {
  transform(value: any): string[] {
    return parseCsvArray(value);
  }
}
