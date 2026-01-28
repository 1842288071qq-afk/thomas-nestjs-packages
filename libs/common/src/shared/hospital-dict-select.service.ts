import { Injectable } from '@nestjs/common';
import { CacheService } from '@app/core/nest/cache/cache.service';
import { HospitalDictSharedService } from './hospital-dict-shared.service';

export interface HospitalDictSelectItem {
  value: string;
  text: string;
}

@Injectable()
export class HospitalDictSelectService {
  constructor(
    private readonly hospitalDictSharedService: HospitalDictSharedService,
    private readonly cacheService: CacheService,
  ) {}

  private selectListKeyPrefix(hospitalId: string, dictKey: string): string {
    return `hospital:dict:select-list:${hospitalId}:${dictKey}`;
  }

  async getSelectList(
    hospitalId: string,
    dictKey: string,
  ): Promise<HospitalDictSelectItem[]> {
    return this.cacheService.wrap<HospitalDictSelectItem[]>(
      {
        key: `${this.selectListKeyPrefix(hospitalId, dictKey)}:enabled`,
        ttl: 0,
      },
      async () => {
        const list: HospitalDictSelectItem[] = (
          await this.hospitalDictSharedService.findDictList(hospitalId, {
            dictKey,
            isEnabled: true,
          })
        ).map((item) => ({
          value: item.value,
          text: item.text,
        }));
        return list;
      },
    );
  }

  async evictSelectListCache(
    hospitalId: string,
    dictKey: string,
  ): Promise<void> {
    const keys = await this.cacheService.scan(
      `${this.selectListKeyPrefix(hospitalId, dictKey)}:*`,
    );
    if (keys.length > 0) {
      await this.cacheService.evictMany(keys);
    }
  }
}
