import { UnauthorizedException } from '@nestjs/common';
import { JwtErrorCode } from './jwt-error.enum';

export class JwtAuthException extends UnauthorizedException {
  constructor(code: JwtErrorCode) {
    let message = '';
    switch (code) {
      case JwtErrorCode.MISSING:
        message = '缺少令牌';
        break;
      case JwtErrorCode.INVALID:
        message = '无效的令牌';
        break;
      case JwtErrorCode.EXPIRED:
        message = '令牌已过期';
        break;
      default:
        message = '令牌认证失败';
    }
    super({
      code,
      message,
    });
  }
}
