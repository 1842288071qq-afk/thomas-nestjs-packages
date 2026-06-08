import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { BizError } from '../BizError';
import { ApiResBody } from '../ApiResBody';
import { ValidationException } from './validate.pipe';
import { JwtAuthException } from './jwt-auth/error/jwt.exception';
import { JwtErrorCode } from './jwt-auth';

/**
 * 全局自定义处理异常，主要是为了统一ApiResBody格式和对BizError的自动处http理
 */
@Catch()
export class CatchEverythingFilter implements ExceptionFilter {
  private readonly logger = new Logger(CatchEverythingFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();

    let responseBody: ApiResBody = ApiResBody.ofWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
      '服务出错',
    );
    let httpStatus: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let caught = false;

    while (!caught) {
      // 业务错误情况
      if (exception instanceof BizError) {
        caught = true;
        httpStatus = exception['httpStatus'] ?? 400;
        responseBody = ApiResBody.ofWith(exception['code'], exception.message);
        const bizData: unknown = exception['data'];
        if (bizData != null) {
          responseBody.data = bizData as Record<string, unknown>;
        }
        break;
      }

      // 参数校验错误
      if (exception instanceof ValidationException) {
        caught = true;
        httpStatus = HttpStatus.BAD_REQUEST;
        responseBody = ApiResBody.ofWith(400, exception.message);
        responseBody.setDetails(exception.validationErrors);
        break;
      }

      // jwt认证错误（耦合core中提供的jwt校验集成）
      if (exception instanceof JwtAuthException) {
        caught = true;
        httpStatus = exception.getStatus();
        // 业务code根据 JwtAuthException 构造时传入的 code 设置
        let code = 4000;
        switch (exception.getResponse()['code']) {
          case JwtErrorCode.MISSING:
            code = 4001;
            break;
          case JwtErrorCode.INVALID:
            code = 4002;
            break;
          case JwtErrorCode.EXPIRED:
            code = 4003;
            break;
        }
        responseBody = ApiResBody.ofWith(code, exception.message);
        break;
      }

      // Nest 内置 Http 异常
      if (exception instanceof HttpException) {
        caught = true;
        httpStatus = exception.getStatus();
        const res = exception.getResponse();
        // 如果是 ApiResBody 直接使用
        if (res instanceof ApiResBody) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          responseBody = res;
          break;
        }
        // 如果是字符串消息直接放入message
        if (typeof res === 'string') {
          responseBody = ApiResBody.ofWith(httpStatus, res);
        } else if (typeof res === 'object' && res !== null) {
          // 否则尝试解析里面的message字段，并设置details
          responseBody = ApiResBody.ofWith(
            httpStatus,
            exception.message ?? '请求失败',
          );
          responseBody.setDetails(res);
        }
        break;
      }
      break;
    }

    if (!caught) {
      // 记录未捕获的错误堆栈信息
      this.logger.error(
        `Unhandled exception: ${(exception as Error).message || 'Unknown error'}`,
        (exception as Error).stack,
      );

      responseBody.setDetails({
        name: (exception as Error).name,
        stack: (exception as Error).stack,
      });
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
