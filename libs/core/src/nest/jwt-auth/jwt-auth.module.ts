import { DynamicModule, Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy/jwt.strategy';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { JwtIssuer } from './helper/jwt-issuer.helper';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

@Global()
@Module({})
export class JwtAuthModule {
  static forRoot(): DynamicModule {
    return {
      module: JwtAuthModule,
      imports: [PassportModule],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        // 全局启用JwtAuthGuard
        {
          provide: APP_GUARD,
          useClass: JwtAuthGuard,
        },
        {
          provide: JwtIssuer,
          useFactory: (config: ConfigService) => {
            return new JwtIssuer(config);
          },
          inject: [ConfigService],
        },
      ],
      // Export JwtIssuer so downstream modules (e.g., UserModule) can inject it
      exports: [JwtAuthGuard, JwtIssuer],
    };
  }
}
