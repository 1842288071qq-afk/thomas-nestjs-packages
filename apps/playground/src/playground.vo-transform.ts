import { HelloResultDTO } from './DTO/playground.dto';
import type { HelloResultVO } from './vo/playground.types';

export function transformHelloResultToVO(dto: HelloResultDTO): HelloResultVO {
  return {
    text: dto.message,
  };
}
