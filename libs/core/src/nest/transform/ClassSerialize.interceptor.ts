import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { map } from 'rxjs';

@Injectable()
export class ClassSerializeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile) return data;
        return instanceToPlain(data);
      }),
    );
  }
}
