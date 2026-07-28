import {
  Controller,
  Get,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PlaygroundService } from './playground.service';
import { ApiResBody } from '@qyy-code-lego/nestjs/core/ApiResBody';
import { ConfigService } from '@nestjs/config';
import { BizError } from '@qyy-code-lego/nestjs/core/BizError';
import { DataSourceConfig } from '@qyy-code-lego/nestjs/common/config/config.interface';
import { ThreadLocal } from '@qyy-code-lego/nestjs/core/nest/als/thread-local';
import { RedisService } from '@qyy-code-lego/nestjs/core/nest/redis/redis.service';
import { transformHelloResultToVO } from './playground.vo-transform';
import type { HelloResultVO } from './vo/playground.types';

@Controller()
export class PlaygroundController {
  constructor(
    private readonly playgroundService: PlaygroundService,
    private readonly ConfigService: ConfigService<AllConfig>,
    private readonly threadLocal: ThreadLocal,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  getHello(): HelloResultVO {
    const requestId = this.threadLocal.get('requestId');
    const store = this.threadLocal.getStore();
    console.log('Request ID from ThreadLocal:', requestId, store?.identity);
    return transformHelloResultToVO(this.playgroundService.getHello());
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
