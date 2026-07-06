import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import * as fs from 'fs';
import * as path from 'path';
import { DictGroup, DictItem, DictTranslateResult } from './dictionary.types';

@Injectable()
export class DictionaryService implements OnModuleInit {
  private readonly logger = new Logger(DictionaryService.name);
  /** 兼容形态：聚合字典文件（数组，每个元素为一个字典分组） */
  private readonly DICT_FILE = path.join(process.cwd(), 'public/dict.json');
  /** 推荐形态：分片字典目录，每个文件一个字典，文件名即字典 key */
  private readonly DICT_DIR = path.join(process.cwd(), 'public/dict');
  private readonly REDIS_PREFIX_FULL = 'dict:full:';
  private readonly REDIS_PREFIX_MAP = 'dict:map:';
  private allDictionaries: DictGroup[] = [];

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    await this.refresh();
  }

  /**
   * 刷新字典缓存：加载全部来源 -> 校验 -> 同步到 Redis
   *
   * 数据来源（后者优先，同 key 时分片覆盖聚合）：
   * 1. `public/dict.json`  —— 聚合形态，兼容历史用法
   * 2. `public/dict/*.json` —— 分片形态，文件名即字典 key（推荐）
   */
  async refresh() {
    const groups = this.loadAllGroups();
    const newAllDictionaries: DictGroup[] = [];

    for (const group of groups) {
      const [validatedItems, error] = await this.syncGroupToRedis(group);
      if (error) {
        this.logger.error(
          `Failed to sync dictionary "${group.key}" to Redis`,
          error,
        );
        continue;
      }
      newAllDictionaries.push({ ...group, items: validatedItems });
    }

    this.allDictionaries = newAllDictionaries;
    this.logger.log(
      `Dictionary cache refreshed successfully (${newAllDictionaries.length} groups)`,
    );
  }

  /**
   * 汇总两种来源的字典分组，按 key 去重（分片目录优先）
   */
  private loadAllGroups(): DictGroup[] {
    const groupMap = new Map<string, DictGroup>();

    // 1. 兼容 public/dict.json（聚合形态）
    for (const group of this.loadFromMonolith()) {
      this.upsertGroup(groupMap, group, 'public/dict.json');
    }

    // 2. 加载 public/dict/*.json（分片形态，优先级更高）
    for (const group of this.loadFromShardDir()) {
      this.upsertGroup(groupMap, group, `public/dict/${group.key}.json`);
    }

    return [...groupMap.values()];
  }

  /**
   * 读取聚合形态 public/dict.json，返回字典分组数组
   */
  private loadFromMonolith(): DictGroup[] {
    if (!fs.existsSync(this.DICT_FILE)) {
      return [];
    }

    const [parsed, error] = this.readJsonFile<DictGroup[]>(this.DICT_FILE);
    if (error) {
      this.logger.error(`Failed to parse ${this.DICT_FILE}`, error);
      return [];
    }
    if (!Array.isArray(parsed)) {
      this.logger.warn(
        `Dictionary file ${this.DICT_FILE} must be an array of groups, skipped.`,
      );
      return [];
    }

    return parsed;
  }

  /**
   * 读取分片目录 public/dict/*.json，每个文件转为一个字典分组
   * 强制约定：文件名（去后缀）即字典 key，每个文件仅承载一个字典
   */
  private loadFromShardDir(): DictGroup[] {
    if (!fs.existsSync(this.DICT_DIR)) {
      return [];
    }

    const groups: DictGroup[] = [];
    const files = fs
      .readdirSync(this.DICT_DIR)
      .filter((file) => file.toLowerCase().endsWith('.json'));

    for (const file of files) {
      const key = path.basename(file, path.extname(file));
      const filePath = path.join(this.DICT_DIR, file);

      const [parsed, error] = this.readJsonFile<Partial<DictGroup>>(filePath);
      if (error) {
        this.logger.error(`Failed to parse ${filePath}`, error);
        continue;
      }
      if (Array.isArray(parsed) || typeof parsed !== 'object' || !parsed) {
        this.logger.warn(
          `Shard dictionary ${file} must contain a single dict object ({ name, items }), skipped.`,
        );
        continue;
      }
      if (parsed.key && parsed.key !== key) {
        this.logger.warn(
          `Shard dictionary ${file}: inner key "${parsed.key}" mismatches filename, using filename "${key}".`,
        );
      }

      groups.push({
        key,
        name: parsed.name ?? key,
        items: parsed.items ?? [],
      });
    }

    return groups;
  }

  /**
   * 写入分组去重表，同 key 时后写入者覆盖并告警
   */
  private upsertGroup(
    map: Map<string, DictGroup>,
    group: DictGroup,
    source: string,
  ) {
    if (!group.key) {
      this.logger.warn(`Dictionary group without key skipped (from ${source}).`);
      return;
    }
    if (map.has(group.key)) {
      this.logger.warn(
        `Duplicate dictionary key "${group.key}" from ${source} overrides the previous definition.`,
      );
    }
    map.set(group.key, group);
  }

  /**
   * 读取并解析 JSON 文件，返回 [数据, 错误] 元组，调用方无需 try/catch
   */
  private readJsonFile<T>(filePath: string): [T | null, Error | null] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return [JSON.parse(content) as T, null];
    } catch (error) {
      return [null, error as Error];
    }
  }

  private async syncGroupToRedis(
    group: DictGroup,
  ): Promise<[DictItem[], Error | null]> {
    const { key, items } = group;
    const flatMap = new Map<string, DictTranslateResult>();
    const seenValues = new Set<string>();

    const validatedItems = this.validateAndFlatten(
      items ?? [],
      null,
      null,
      flatMap,
      seenValues,
      key,
    );

    try {
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
    } catch (error) {
      return [validatedItems, error as Error];
    }

    return [validatedItems, null];
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
