import { DynamicModule, Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy/jwt.strategy';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { JwtIssuer } from './helper/jwt-issuer.helper';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { SessionModule } from '../session/session.module';
import { SessionService } from '../session/session.service';
import { SessionGuard } from '../session/guard/session.guard';

@Global()
@Module({})
export class JwtAuthModule {
  static forRoot(): DynamicModule {
    return {
      module: JwtAuthModule,
      imports: [PassportModule, SessionModule],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        // 全局启用JwtAuthGuard
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        // 全局启用SessionGuard (必须在JwtAuthGuard之后)
        {
          provide: APP_GUARD,
          useClass: SessionGuard,
        },
        {
          provide: JwtIssuer,
          useFactory: (
            config: ConfigService,
            sessionService: SessionService,
          ) => {
            return new JwtIssuer(config, sessionService);
          },
          inject: [ConfigService, SessionService],
        },
      ],
      // Export JwtIssuer so downstream modules (e.g., UserModule) can inject it
      exports: [JwtAuthGuard, JwtIssuer],
    };
  }
}
