import {
  Controller,
  Get,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PlaygroundService } from './playground.service';
import { ApiResBody } from '@app/core/ApiResBody';
import { ConfigService } from '@nestjs/config';
import { BizError } from '@app/core/BizError';
import { DataSourceConfig } from '@app/common/config/config.interface';
import { ThreadLocal } from '@app/core/nest/als/thread-local';
import { RedisService } from '@app/core/nest/redis/redis.service';

@Controller()
export class PlaygroundController {
  constructor(
    private readonly playgroundService: PlaygroundService,
    private readonly ConfigService: ConfigService<AllConfig>,
    private readonly threadLocal: ThreadLocal,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  getHello(): string {
    const requestId = this.threadLocal.get('requestId');
    const store = this.threadLocal.getStore();
    console.log('Request ID from ThreadLocal:', requestId, store?.identity);
    return this.playgroundService.getHello();
  }

  @Get('config')
  getConfig() {
    const config = this.ConfigService.get<DataSourceConfig>('datasource');
    return ApiResBody.of(config);
  }

  @Get('bizError')
  getBizError() {
    throw new BizError('This is a biz error');
  }

  @Get('error')
  getError() {
    throw new Error('This is a  error');
  }

  @Get('httpError')
  getHttpError() {
    throw new UnauthorizedException('401错误');
  }

  @Get('nestedHttpError')
  getNestedHttpError() {
    throw new NotFoundException(
      ApiResBody.ofWith(404, '资源不存在', { test: 123 }),
    );
  }

  @Get('redis')
  async testRedis() {
    const redisHelper = this.redisService.getHelper();
    const testKey = 'playground:test:key';
    await redisHelper.set(testKey, { foo: 'bar' }, 60);
    const value = await redisHelper.get<{ foo: string }>(testKey);
    return ApiResBody.of(value);
  }
}
