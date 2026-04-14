import { registerAs } from '@nestjs/config';
import { parseDurationSeconds } from './parse-duration-seconds';

export const jwtConfig = registerAs('jwt', () => {
  const secret = process.env.JWT_SECRET || 'default_jwt_secret';
  const defaultExpiresIn = parseDurationSeconds(
    process.env.JWT_EXPIRES_IN ?? process.env.SESSION_MAX_TIME,
    43200,
  );

  return {
    secret,
    expiresIn: defaultExpiresIn,
    defaultExpiresIn,
  };
});
