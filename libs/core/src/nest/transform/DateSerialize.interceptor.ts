import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Request } from 'express';

// dayjs应用timezone
dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class DateSerializeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    let timezone = '';
    const clientTimezones = request.headers['x-timezone'];
    // 数组情况
    if (Array.isArray(clientTimezones)) {
      timezone = clientTimezones[0];
    } else if (typeof clientTimezones === 'string') {
      timezone = clientTimezones;
    }
    return next
      .handle()
      .pipe(map((data) => this.serializeDate(data, timezone)));
  }

  private serializeDate(obj: unknown, timezone?: string): unknown {
    let dateVal: dayjs.Dayjs | null = null;

    if (obj instanceof Date) {
      dateVal = dayjs(obj);
    } else if (
      typeof obj === 'string' &&
      obj.length >= 20 &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)
    ) {
      const d = dayjs(obj);
      if (d.isValid()) {
        dateVal = d;
      }
    }

    if (dateVal) {
      if (timezone) {
        // 使用客户端时区
        return dateVal.tz(timezone).format('YYYY-MM-DD HH:mm:ss');
      }
      // 这里使用dayjs反序列化,dayjs会使用系统环境时区
      return dateVal.format('YYYY-MM-DD HH:mm:ss');
    }

    if (Array.isArray(obj)) {
      return obj.map((i) => this.serializeDate(i, timezone));
    }

    if (obj && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [
          k,
          this.serializeDate(v, timezone),
        ]),
      );
    }

    return obj;
  }
}
