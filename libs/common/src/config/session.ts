import { registerAs } from '@nestjs/config';
import { parseDurationSeconds } from './parse-duration-seconds';

export const sessionConfig = registerAs('session', () => {
  const maxTime = parseDurationSeconds(process.env.SESSION_MAX_TIME, 43200);
  const debounceTime = parseDurationSeconds(
    process.env.SESSION_DEBOUNCE_TIME,
    60,
  );
  const kickOutEnable =
    process.env.SESSION_KICK_OUT_ENABLE?.trim().toLowerCase() !== 'false';

  return {
    maxTime,
    debounceTime,
    kickOutEnable,
  };
});
