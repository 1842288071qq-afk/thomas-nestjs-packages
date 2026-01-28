import { Identity } from '@app/entities/auth';
import { BizError } from '@app/core/BizError';

/**
 * 从身份信息中获取医院 ID
 * @param identity 身份信息
 * @returns 医院 ID
 */
export function getHospitalIdFromIdentity(identity: Identity): string {
  const hospitalId =
    identity?.hospitalAdmin?.hospitalId || identity?.student?.hospitalId;
  if (!hospitalId) {
    throw new BizError('未获取到医院身份信息');
  }
  return hospitalId;
}
