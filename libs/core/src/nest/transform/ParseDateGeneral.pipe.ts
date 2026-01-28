import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

/**
 * 通用日期解析函数
 * 支持多种格式输入：Date 对象、时间戳、ISO 字符串等
 *
 * @param value 待转换的值
 * @returns Date 对象
 * @throws BadRequestException 当转换失败时抛出 400 错误
 */
export function parseDate(value: unknown): Date {
  // null 或 undefined
  if (value === null || value === undefined) {
    throw new BadRequestException('日期值不能为空');
  }

  // 已经是 Date 对象
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      throw new BadRequestException('无效的日期对象');
    }
    return value;
  }

  // 数字类型（时间戳）
  if (typeof value === 'number') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('无效的时间戳');
    }
    return date;
  }

  // 字符串类型
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      throw new BadRequestException('日期字符串不能为空');
    }

    // 尝试解析为时间戳
    const timestamp = Number(trimmed);
    if (!isNaN(timestamp) && trimmed.length >= 10) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // 尝试解析日期字符串
    const date = new Date(trimmed);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(`无效的日期格式: ${trimmed}`);
    }
    return date;
  }

  throw new BadRequestException(`不支持的日期类型: ${typeof value}`);
}

/**
 * NestJS 通用日期解析管道
 * 用于将 HTTP 请求参数转换为 Date 对象
 *
 * 使用示例：
 * ```typescript
 * @Get()
 * findByDate(@Query('date', ParseDateGeneralPipe) date: Date) {
 *   // date 已经是 Date 对象
 * }
 * ```
 */
export class ParseDateGeneralPipe implements PipeTransform<unknown, Date> {
  transform(value: unknown, _metadata: ArgumentMetadata): Date {
    return parseDate(value);
  }
}
