import { HelloResultDTO } from './dto/playground.dto';
import { HelloResultVO } from './vo/playground.types';

export function transformHelloResultToVO(dto: HelloResultDTO): HelloResultVO {
  return {
    text: dto.message,
  };
}
