import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { JwtFromRequestFunction } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

type JwtPayload = Record<string, unknown>;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private static readonly bearerTokenExtractor: JwtFromRequestFunction = (
    req: Request,
  ) => {
    const authHeader = req.get('authorization');
    if (!authHeader) {
      return null;
    }

    const [scheme, token] = authHeader.split(' ');
    return /^Bearer$/i.test(scheme) ? (token ?? null) : null;
  };

  constructor(config: ConfigService) {
    super({
      jwtFromRequest: JwtStrategy.bearerTokenExtractor,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
      ignoreExpiration: false,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    // ⚠️ 不做任何业务
    return payload;
  }
}
