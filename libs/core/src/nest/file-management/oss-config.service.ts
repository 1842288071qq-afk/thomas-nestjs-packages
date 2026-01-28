import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SysOssConfigEntity } from '@app/entities/core/sys/sys-oss-config.entity';
import { CreateOssConfigDto, UpdateOssConfigDto } from './dto/oss-config.dto';
import { BizError } from '@app/core/BizError';
import { ThreadLocal } from '@app/core/nest/als/thread-local';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class OssConfigService {
  private readonly CACHE_PREFIX = 'oss_config:';
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @InjectRepository(SysOssConfigEntity)
    private readonly ossConfigRepo: Repository<SysOssConfigEntity>,
    private readonly threadLocal: ThreadLocal,
    private readonly redisService: RedisService,
  ) {}

  private getCacheKeys(id?: string, code?: string) {
    const keys: string[] = [];
    if (id) keys.push(`${this.CACHE_PREFIX}id:${id}`);
    if (code) keys.push(`${this.CACHE_PREFIX}code:${code}`);
    return keys;
  }

  private async clearCache(id?: string, code?: string) {
    const keys = this.getCacheKeys(id, code);
    if (keys.length > 0) {
      await this.redisService.del(...keys);
    }
  }

  async create(dto: CreateOssConfigDto) {
    const existing = await this.ossConfigRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BizError('配置识别码已存在').codeAs(400);
    }

    const config = this.ossConfigRepo.create(dto);
    const store = this.threadLocal.getStore();
    if (store?.identity) {
      config.createdBy = store.identity.id;
      config.updatedBy = store.identity.id;
    }

    const result = await this.ossConfigRepo.save(config);
    await this.clearCache(result.id, result.code);
    return result;
  }

  async update(id: string, dto: UpdateOssConfigDto) {
    const config = await this.ossConfigRepo.findOne({ where: { id } });
    if (!config) {
      throw new BizError('配置不存在').codeAs(404);
    }

    Object.assign(config, dto);
    const store = this.threadLocal.getStore();
    if (store?.identity) {
      config.updatedBy = store.identity.id;
    }

    const result = await this.ossConfigRepo.save(config);
    await this.clearCache(result.id, result.code);
    return result;
  }

  async findOne(id: string) {
    const cacheKey = `${this.CACHE_PREFIX}id:${id}`;
    const cached = await this.redisService.get<SysOssConfigEntity>(cacheKey);
    if (cached) return cached;

    const config = await this.ossConfigRepo.findOne({ where: { id } });
    if (!config) {
      throw new BizError('配置不存在').codeAs(404);
    }

    await this.redisService.set(cacheKey, config, this.CACHE_TTL);
    if (config.code) {
      // 同时缓存 code 映射
      await this.redisService.set(
        `${this.CACHE_PREFIX}code:${config.code}`,
        config,
        this.CACHE_TTL,
      );
    }

    return config;
  }

  async findByCode(code: string) {
    const cacheKey = `${this.CACHE_PREFIX}code:${code}`;
    const cached = await this.redisService.get<SysOssConfigEntity>(cacheKey);
    if (cached) return cached;

    const config = await this.ossConfigRepo.findOne({ where: { code } });
    if (config) {
      await this.redisService.set(cacheKey, config, this.CACHE_TTL);
      await this.redisService.set(
        `${this.CACHE_PREFIX}id:${config.id}`,
        config,
        this.CACHE_TTL,
      );
    }
    return config;
  }

  async findAll() {
    return await this.ossConfigRepo.find();
  }

  async delete(id: string) {
    const config = await this.ossConfigRepo.findOne({ where: { id } });
    if (config) {
      await this.clearCache(id, config.code);
    }
    const result = await this.ossConfigRepo.delete(id);
    return !!result.affected && result.affected > 0;
  }
}
