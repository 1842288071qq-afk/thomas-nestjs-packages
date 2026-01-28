import { HttpStatus } from '@nestjs/common';

export class BizError extends Error {
  // 业务上，不需要考虑http状态码，但允许直接由业务错误控制http返回
  // 将在全局异常过滤器中处理
  private httpStatus: number = HttpStatus.BAD_REQUEST;
  // 对应ApiResBody的code
  private code: number = 400;

  constructor(message: string) {
    super(message);
    this.name = 'BizError';
  }
  httpStatusAs(httpStatus: number): this {
    this.httpStatus = httpStatus;
    return this;
  }
  codeAs(code: number): this {
    this.code = code;
    return this;
  }
}
