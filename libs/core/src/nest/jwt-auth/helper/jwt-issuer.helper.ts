import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../types/jwt-payload.type';
import { JwtIssueInput } from '../types/jwt-issue-input.type';
import { JwtIssueResult } from '../types/jwt-issue-result.type';
import { SessionService } from '../../session/session.service';

export class JwtIssuer {
  constructor(
    private readonly config: ConfigService,
    private readonly sessionService?: SessionService,
  ) {}

  async issue(input: JwtIssueInput): Promise<JwtIssueResult> {
    const now = Math.floor(Date.now() / 1000);

    const defaultExpiresIn = this.config.get<number>('jwt.defaultExpiresIn');

    const expiresIn = input.expiresIn ?? defaultExpiresIn;

    const payload: JwtPayload = {
      jti: randomUUID(),
      accountId: input.accountId,
      identityIds: input.identityIds,
      client: input.client,
      system: input.system,
      iat: now,
    };

    // 只有在有 expiresIn 时才设置 exp
    if (expiresIn && expiresIn > 0) {
      payload.exp = now + expiresIn;
    }

    // --- 会话持久化 ---
    if (this.sessionService) {
      await this.sessionService.createSession({
        jti: payload.jti,
        accountId: payload.accountId,
        client: payload.client,
        system: payload.system,
      });
    }

    const secret = this.config.get<string>('jwt.secret')!;
    const token = jwt.sign(payload, secret);

    return { token, payload };
  }
}
