import { Injectable, NestMiddleware } from '@nestjs/common';
import { ThreadLocal } from './thread-local';

@Injectable()
export class ThreadLocalMiddleware implements NestMiddleware {
  constructor(private readonly threadLocal: ThreadLocal) {}

  use(req: Request, _res: any, next: () => void) {
    const initialStore = {
      requestId:
        (req.headers['x-request-id'] as string) ?? Date.now().toString(),
    };

    this.threadLocal.initStore(initialStore, next);
  }
}
