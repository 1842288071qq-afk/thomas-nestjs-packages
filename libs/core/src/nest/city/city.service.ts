/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import * as fs from 'fs';
import * as path from 'path';
import { CityNode, CityType, CityTranslateResult } from './city.types';

@Injectable()
export class CityService implements OnModuleInit {
  private readonly logger = new Logger(CityService.name);
  private readonly DATA_PATH = path.join(
    process.cwd(),
    'public/ChinaCitys.json',
  );
  private readonly REDIS_PREFIX_FULL = 'city:full';
  private readonly REDIS_PREFIX_MAP = 'city:map';

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    await this.refresh();
  }

  async refresh() {
    try {
      if (!fs.existsSync(this.DATA_PATH)) {
        this.logger.warn(`City data file not found at ${this.DATA_PATH}`);
        return;
      }

      const content = fs.readFileSync(this.DATA_PATH, 'utf-8');
      const rawData = JSON.parse(content) as any[];

      const { tree, flatMap } = this.transformData(rawData);

      // Save to Redis
      await this.redisService.set(this.REDIS_PREFIX_FULL, tree);

      const hashData: Record<string, string> = {};
      flatMap.forEach((value, code) => {
        hashData[code] = JSON.stringify(value);
      });

      if (Object.keys(hashData).length > 0) {
        const client = this.redisService.getClient();
        await client.hmset(this.REDIS_PREFIX_MAP, hashData);
      }

      this.logger.log('City data refreshed successfully');
    } catch (error) {
      this.logger.error('Failed to refresh city data', error);
    }
  }

  private transformData(rawData: any[]): {
    tree: CityNode[];
    flatMap: Map<string, CityTranslateResult>;
  } {
    const tree: CityNode[] = [];
    const flatMap = new Map<string, CityTranslateResult>();

    for (const p of rawData) {
      const pNode: CityNode = {
        code: p.code as string,
        name: p.province as string,
        type: CityType.PROVINCE,
        children: [],
      };

      const pPath = [p.province as string];
      const pCodePath = [p.code as string];

      this.addToMap(
        flatMap,
        p.code as string,
        p.province as string,
        CityType.PROVINCE,
        pPath,
        pCodePath,
      );

      if (p.citys) {
        for (const c of p.citys) {
          const cNode: CityNode = {
            code: c.code as string,
            name: c.city as string,
            type: CityType.CITY,
            children: [],
          };

          const cPath = [...pPath, c.city as string];
          const cCodePath = [...pCodePath, c.code as string];

          this.addToMap(
            flatMap,
            c.code as string,
            c.city as string,
            CityType.CITY,
            cPath,
            cCodePath,
          );

          if (c.areas) {
            for (const a of c.areas) {
              const aNode: CityNode = {
                code: a.code as string,
                name: a.area as string,
                type: CityType.AREA,
              };

              const aPath = [...cPath, a.area as string];
              const aCodePath = [...cCodePath, a.code as string];

              this.addToMap(
                flatMap,
                a.code as string,
                a.area as string,
                CityType.AREA,
                aPath,
                aCodePath,
              );
              cNode.children!.push(aNode);
            }
          }
          pNode.children!.push(cNode);
        }
      }
      tree.push(pNode);
    }

    return { tree, flatMap };
  }

  private addToMap(
    flatMap: Map<string, CityTranslateResult>,
    code: string,
    name: string,
    type: CityType,
    namePath: string[],
    codePath: string[],
  ) {
    flatMap.set(code, {
      code,
      name,
      type,
      namePath,
      codePath,
    });
  }

  async getProvinces(): Promise<CityNode[]> {
    const fullTree = await this.redisService.get<CityNode[]>(
      this.REDIS_PREFIX_FULL,
    );
    if (!fullTree) return [];
    return fullTree.map(({ children, ...rest }) => rest as CityNode);
  }

  async getCities(provinceCode: string): Promise<CityNode[]> {
    const fullTree = await this.redisService.get<CityNode[]>(
      this.REDIS_PREFIX_FULL,
    );
    if (!fullTree) return [];
    const province = fullTree.find((p) => p.code === provinceCode);
    if (!province || !province.children) return [];
    return province.children.map(({ children, ...rest }) => rest as CityNode);
  }

  async getAreas(cityCode: string): Promise<CityNode[]> {
    const fullTree = await this.redisService.get<CityNode[]>(
      this.REDIS_PREFIX_FULL,
    );
    if (!fullTree) return [];
    for (const p of fullTree) {
      if (p.children) {
        const city = p.children.find((c) => c.code === cityCode);
        if (city && city.children) return city.children;
      }
    }
    return [];
  }

  async translate(code: string): Promise<CityTranslateResult | null> {
    const client = this.redisService.getClient();
    const data = await client.hget(this.REDIS_PREFIX_MAP, code);
    if (!data) return null;
    return JSON.parse(data) as CityTranslateResult;
  }

  async getFullTree(): Promise<CityNode[]> {
    return (
      (await this.redisService.get<CityNode[]>(this.REDIS_PREFIX_FULL)) || []
    );
  }
}
