import { Controller, Get, Param } from '@nestjs/common';
import { DictionaryService } from './dictionary.service';
import { Public } from '../jwt-auth/decorator/public.decorator';
import { ApiResBody } from '../../ApiResBody';

@Controller('dict')
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  /**
   * 获取所有字典数据
   */
  @Public()
  @Get('all')
  getAll() {
    const data = this.dictionaryService.getAll();
    return ApiResBody.of(data);
  }

  /**
   * 获取字典树形列表
   */
  @Public()
  @Get('list/:key')
  async getList(@Param('key') key: string) {
    const data = await this.dictionaryService.getList(key);
    return ApiResBody.of(data);
  }

  /**
   * 翻译字典项
   */
  @Public()
  @Get('translate/:key/:code')
  async translate(@Param('key') key: string, @Param('code') code: string) {
    const data = await this.dictionaryService.translate(key, code);
    return ApiResBody.of(data);
  }
}
