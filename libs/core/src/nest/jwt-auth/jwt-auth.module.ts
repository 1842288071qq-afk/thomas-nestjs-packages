import { DynamicModule, Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy/jwt.strategy';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { JwtIssuer } from './helper/jwt-issuer.helper';
import { ConfigService } from '@nestjs/config';
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
        SessionGuard,
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
