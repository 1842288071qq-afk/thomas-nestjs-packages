const DURATION_UNITS: Record<string, number> = {
  s: 1,
  sec: 1,
  secs: 1,
  second: 1,
  seconds: 1,
  秒: 1,
  m: 60,
  min: 60,
  mins: 60,
  minute: 60,
  minutes: 60,
  分: 60,
  分钟: 60,
  h: 3600,
  hr: 3600,
  hrs: 3600,
  hour: 3600,
  hours: 3600,
  小时: 3600,
  d: 86400,
  day: 86400,
  days: 86400,
  天: 86400,
};

export function parseDurationSeconds(
  rawValue: string | undefined,
  fallbackSeconds: number,
): number {
  if (!rawValue) return fallbackSeconds;

  const normalized = rawValue.trim().toLowerCase();
  const match = normalized.match(/^(\d+)\s*([a-z\u4e00-\u9fa5]+)?$/i);

  if (!match) return fallbackSeconds;

  const value = Number(match[1]);
  const unit = match[2];

  if (!Number.isFinite(value)) return fallbackSeconds;
  if (!unit) return value;

  const multiplier = DURATION_UNITS[unit];
  return multiplier ? value * multiplier : fallbackSeconds;
}
