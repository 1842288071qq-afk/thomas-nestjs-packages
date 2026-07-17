import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SysOssConfigEntity } from '@thomas/nestjs/entities/core/sys/sys-oss-config.entity';
import { CreateOssConfigDto, UpdateOssConfigDto } from './dto/oss-config.dto';
import { BizError } from '@thomas/nestjs/core/BizError';
import { ThreadLocal } from '@thomas/nestjs/core/nest/als/thread-local';
import { RedisService } from '../redis/redis.service';
import {
  OssAddressingStyle,
  OssProvider,
  OssS3Config,
} from '@thomas/nestjs/entities/core/sys/oss-s3-config.interface';

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

  private getCacheKeys(code?: string) {
    const keys: string[] = [];
    if (code) keys.push(`${this.CACHE_PREFIX}code:${code}`);
    return keys;
  }

  private async clearCache(code?: string) {
    const keys = this.getCacheKeys(code);
    if (keys.length > 0) {
      await this.redisService.del(...keys);
    }
  }

  async create(dto: CreateOssConfigDto) {
    this.validateS3Config(dto.config);
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
    await this.clearCache(result.code);
    return result;
  }

  async update(code: string, dto: UpdateOssConfigDto) {
    this.validateS3Config(dto.config);
    const config = await this.ossConfigRepo.findOne({ where: { code } });
    if (!config) {
      throw new BizError('配置不存在').codeAs(404);
    }

    const originalCode = config.code;

    Object.assign(config, dto);
    const store = this.threadLocal.getStore();
    if (store?.identity) {
      config.updatedBy = store.identity.id;
    }

    const result = await this.ossConfigRepo.save(config);
    await this.clearCache(originalCode);
    if (result.code !== originalCode) {
      await this.clearCache(result.code);
    }
    return result;
  }

  async findOne(code: string) {
    const cacheKey = `${this.CACHE_PREFIX}code:${code}`;
    const cached = await this.redisService.get<SysOssConfigEntity>(cacheKey);
    if (cached) return cached;

    const config = await this.ossConfigRepo.findOne({ where: { code } });
    if (!config) {
      throw new BizError('配置不存在').codeAs(404);
    }

    await this.redisService.set(cacheKey, config, this.CACHE_TTL);

    return config;
  }

  async findByCode(code: string) {
    const cacheKey = `${this.CACHE_PREFIX}code:${code}`;
    const cached = await this.redisService.get<SysOssConfigEntity>(cacheKey);
    if (cached) return cached;

    const config = await this.ossConfigRepo.findOne({ where: { code } });
    if (config) {
      await this.redisService.set(cacheKey, config, this.CACHE_TTL);
    }
    return config;
  }

  async findAll() {
    return await this.ossConfigRepo.find();
  }

  async delete(code: string) {
    const config = await this.ossConfigRepo.findOne({ where: { code } });
    if (config) {
      await this.clearCache(config.code);
    }
    const result = await this.ossConfigRepo.delete(code);
    return !!result.affected && result.affected > 0;
  }

  private validateS3Config(config: OssS3Config) {
    const addressingStyle =
      config.addressingStyle ??
      (config.forcePathStyle
        ? OssAddressingStyle.PATH
        : OssAddressingStyle.VIRTUAL_HOSTED);
    if (
      config.provider === OssProvider.ALIYUN &&
      addressingStyle !== OssAddressingStyle.VIRTUAL_HOSTED
    ) {
      throw new BizError('阿里云 OSS 仅支持 virtual-hosted 寻址样式').codeAs(
        400,
      );
    }
    if (
      config.addressingStyle &&
      config.forcePathStyle != null &&
      config.forcePathStyle !==
        (config.addressingStyle === OssAddressingStyle.PATH)
    ) {
      throw new BizError(
        'addressingStyle 与兼容字段 forcePathStyle 配置冲突',
      ).codeAs(400);
    }
  }
}
