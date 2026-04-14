export const CHINA_ID_CARD_REGEX =
  /^[1-9]\d{5}(19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;

export function isChinaIdCardNumber(value: unknown): value is string {
  return typeof value === 'string' && CHINA_ID_CARD_REGEX.test(value);
}
