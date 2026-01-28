import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '@app/core/nest/redis/redis.service';
import { Identity } from '@app/entities';

@Injectable()
export class IdentityActiveService {
  private readonly logger = new Logger(IdentityActiveService.name);
  private readonly DIRTY_SET_KEY = 'identity:lastActive:dirty_set';
  private readonly ACTIVE_KEY_PREFIX = 'identity:lastActive:';
  private readonly LOCK_KEY_PREFIX = 'identity:lastActive:lock:';

  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(Identity)
    private readonly identityRepo: Repository<Identity>,
  ) {}

  /**
   * 记录身份活跃
   * @param identityId 身份ID
   */
  async recordActive(identityId: string) {
    const lockKey = `${this.LOCK_KEY_PREFIX}${identityId}`;
    const exists = await this.redisService.exists(lockKey);
    if (exists) return;

    const now = Math.floor(Date.now() / 1000);
    const activeKey = `${this.ACTIVE_KEY_PREFIX}${identityId}`;

    // 使用 Redis 记录实时态和节流锁
    await this.redisService.set(activeKey, now, 300); // 5分钟有效期
    await this.redisService.set(lockKey, 1, 60); // 60秒节流

    // 标记为待落库
    await this.redisService.getHelper().sadd(this.DIRTY_SET_KEY, identityId);
  }

  /**
   * 定时任务：异步落库（每5分钟执行一次）
   */
  @Cron('0 */5 * * * *')
  async syncToDb() {
    const dirtyMembers = await this.redisService
      .getHelper()
      .smembers(this.DIRTY_SET_KEY);
    if (dirtyMembers.length === 0) return;

    this.logger.log(`Syncing ${dirtyMembers.length} active statistics to DB`);

    // 执行同步
    await this.syncIdentitiesToRepo(this.identityRepo, dirtyMembers);

    // 清理已处理的标记
    await this.redisService
      .getHelper()
      .srem(this.DIRTY_SET_KEY, ...dirtyMembers);
  }

  private async syncIdentitiesToRepo(repo: Repository<any>, ids: string[]) {
    // 获取 Redis 中的最新时间
    const keys = ids.map((id) => `${this.ACTIVE_KEY_PREFIX}${id}`);
    const times = await this.redisService.mget(keys);

    // 逐个更新
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const time = times[i];
      if (time) {
        await repo.update(id, { lastActiveAt: new Date(Number(time) * 1000) });
      } else {
        await repo.update(id, { lastActiveAt: new Date() });
      }
    }
  }
}
