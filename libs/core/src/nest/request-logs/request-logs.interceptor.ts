import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { RequestLogsService } from './request-logs.service';

@Injectable()
export class RequestLogsInterceptor implements NestInterceptor {
  constructor(private readonly requestLogsService: RequestLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.requestLogsService.isHttpEnabled(context)) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const startContext = this.requestLogsService.start(context, request);
    if (!startContext) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((responseBody) => {
        void this.requestLogsService.finishSuccess(
          startContext,
          responseBody,
          response.statusCode || 200,
        );
      }),
      catchError((error: Error & { getStatus?: () => number }) => {
        void this.requestLogsService.finishError(
          startContext,
          error,
          error?.getStatus?.() ?? response.statusCode ?? 500,
        );

        return throwError(() => error);
      }),
    );
  }
}
