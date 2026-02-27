import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { map } from 'rxjs';

@Injectable()
export class ClassSerializeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data) => {
        // 利用 class-transformer 按照实体装饰器规则转为 plain object
        // 这会处理 @Exclude, @Expose 和 Getter
        return instanceToPlain(data);
      }),
    );
  }
}
