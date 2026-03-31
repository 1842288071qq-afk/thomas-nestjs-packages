import { registerAs } from '@nestjs/config';

export const sessionConfig = registerAs('session', () => {
  const maxTime = parseInt(process.env.SESSION_MAX_TIME || '43200', 10);
  const debounceTime = parseInt(process.env.SESSION_DEBOUNCE_TIME || '60', 10);
  const kickOutEnable =
    process.env.SESSION_KICK_OUT_ENABLE?.trim().toLowerCase() !== 'false';

  return {
    maxTime,
    debounceTime,
    kickOutEnable,
  };
});
