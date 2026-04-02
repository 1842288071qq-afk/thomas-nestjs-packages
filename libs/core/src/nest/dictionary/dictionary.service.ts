import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import * as fs from 'fs';
import * as path from 'path';
import { DictGroup, DictItem, DictTranslateResult } from './dictionary.types';

@Injectable()
export class DictionaryService implements OnModuleInit {
  private readonly logger = new Logger(DictionaryService.name);
  private readonly DICT_PATH = path.join(process.cwd(), 'public/dict.json');
  private readonly REDIS_PREFIX_FULL = 'dict:full:';
  private readonly REDIS_PREFIX_MAP = 'dict:map:';
  private allDictionaries: DictGroup[] = [];

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    await this.refresh();
  }

  /**
   * 刷新字典缓存：读取文件 -> 校验 -> 同步到 Redis
   */
  async refresh() {
    try {
      if (!fs.existsSync(this.DICT_PATH)) {
        this.logger.warn(`Dictionary file not found at ${this.DICT_PATH}`);
        return;
      }

      const content = fs.readFileSync(this.DICT_PATH, 'utf-8');
      const groups = JSON.parse(content) as DictGroup[];
      const newAllDictionaries: DictGroup[] = [];

      for (const group of groups) {
        const validatedItems = await this.syncGroupToRedis(group);
        newAllDictionaries.push({ ...group, items: validatedItems });
      }
      this.allDictionaries = newAllDictionaries;
      this.logger.log('Dictionary cache refreshed successfully');
    } catch (error) {
      this.logger.error('Failed to refresh dictionary cache', error);
    }
  }

  private async syncGroupToRedis(group: DictGroup): Promise<DictItem[]> {
    const { key, items } = group;
    const flatMap = new Map<string, DictTranslateResult>();
    const seenValues = new Set<string>();

    const validatedItems = this.validateAndFlatten(
      items,
      null,
      null,
      flatMap,
      seenValues,
      key,
    );

    // 1. 存储完整树形
    await this.redisService.set(
      `${this.REDIS_PREFIX_FULL}${key}`,
      validatedItems,
    );

    // 2. 存储扁平映射 (Hash)
    const hashData: Record<string, string> = {};
    flatMap.forEach((value, code) => {
      hashData[code] = JSON.stringify(value);
    });

    if (Object.keys(hashData).length > 0) {
      const client = this.redisService.getClient();
      await client.hmset(`${this.REDIS_PREFIX_MAP}${key}`, hashData);
    }

    return validatedItems;
  }

  /**
   * 递归校验唯一性并扁平化路径
   */
  private validateAndFlatten(
    items: DictItem[],
    parentTextPath: string[] | null,
    parentCodePath: string[] | null,
    flatMap: Map<string, DictTranslateResult>,
    seenValues: Set<string>,
    dictKey: string,
  ): DictItem[] {
    const result: DictItem[] = [];

    for (const item of items) {
      if (seenValues.has(item.value)) {
        this.logger.warn(
          `Duplicate code "${item.value}" found in dictionary "${dictKey}". Ignoring this item and its children.`,
        );
        continue;
      }

      seenValues.add(item.value);

      const currentTextPath = parentTextPath
        ? [...parentTextPath, item.text]
        : [item.text];
      const currentCodePath = parentCodePath
        ? [...parentCodePath, item.value]
        : [item.value];

      const { children, value, text, ext, ...extra } = item;
      const normalizedExt =
        ext && typeof ext === 'object'
          ? Object.keys(extra).length > 0
            ? { ...ext, ...extra }
            : ext
          : Object.keys(extra).length > 0
            ? extra
            : undefined;

      // 保存到扁平映射
      flatMap.set(item.value, {
        value: item.value,
        text: item.text,
        textPath: currentTextPath,
        codePath: currentCodePath,
        ext: normalizedExt,
      });

      const newItem: DictItem = { ...item };
      if (item.children && item.children.length > 0) {
        newItem.children = this.validateAndFlatten(
          item.children,
          currentTextPath,
          currentCodePath,
          flatMap,
          seenValues,
          dictKey,
        );
      }
      result.push(newItem);
    }

    return result;
  }

  /**
   * 获取完整树形结构
   */
  async getList(key: string): Promise<DictItem[]> {
    return (
      (await this.redisService.get<DictItem[]>(
        `${this.REDIS_PREFIX_FULL}${key}`,
      )) || []
    );
  }

  /**
   * 翻译指定 code
   */
  async translate(
    key: string,
    value: string,
  ): Promise<DictTranslateResult | null> {
    const client = this.redisService.getClient();
    const data = await client.hget(`${this.REDIS_PREFIX_MAP}${key}`, value);
    if (!data) return null;
    return JSON.parse(data) as DictTranslateResult;
  }

  /**
   * 获取所有字典数据
   */
  getAll() {
    return this.allDictionaries;
  }
}
