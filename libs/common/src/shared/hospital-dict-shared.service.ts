import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BizError } from '@app/core/BizError';
import { HospitalDict } from '@app/entities/other/hospital-dict.entity';

export interface ICreateHospitalDictParams {
  dictKey: string;
  value: string;
  text: string;
  sort?: number;
  isEnabled?: boolean;
  operatorId?: string;
}

export interface IUpdateHospitalDictParams {
  value?: string;
  text?: string;
  sort?: number;
  isEnabled?: boolean;
  operatorId?: string;
}

export interface IHospitalDictQueryParams {
  dictKey?: string;
  value?: string;
  text?: string;
  isEnabled?: boolean;
}

@Injectable()
export class HospitalDictSharedService {
  constructor(
    @InjectRepository(HospitalDict)
    private readonly dictRepository: Repository<HospitalDict>,
  ) {}

  async createDictItem(
    hospitalId: string,
    params: ICreateHospitalDictParams,
  ): Promise<HospitalDict> {
    if (!hospitalId) throw new BizError('医院ID不能为空').codeAs(40001);
    if (!params.dictKey) throw new BizError('字典Key不能为空').codeAs(40002);
    if (!params.value) throw new BizError('字典Value不能为空').codeAs(40003);
    if (!params.text) throw new BizError('字典Text不能为空').codeAs(40004);

    const existing = await this.dictRepository.findOne({
      where: {
        hospitalId,
        dictKey: params.dictKey,
        value: params.value,
      },
    });
    if (existing) {
      throw new BizError('字典项已存在').codeAs(40901);
    }

    const entity = this.dictRepository.create({
      hospitalId,
      dictKey: params.dictKey,
      value: params.value,
      text: params.text,
      sort: params.sort ?? 0,
      isEnabled: params.isEnabled ?? true,
      createdBy: params.operatorId,
      updatedBy: params.operatorId,
    });

    return await this.dictRepository.save(entity);
  }

  async updateDictItem(
    hospitalId: string,
    id: string,
    params: IUpdateHospitalDictParams,
  ): Promise<HospitalDict> {
    if (!hospitalId) throw new BizError('医院ID不能为空').codeAs(40001);
    if (!id) throw new BizError('字典ID不能为空').codeAs(40002);

    const entity = await this.dictRepository.findOne({
      where: { id, hospitalId },
    });
    if (!entity) throw new BizError('字典项不存在').codeAs(40400);

    const nextValue = params.value ?? entity.value;
    if (nextValue !== entity.value) {
      const duplicated = await this.dictRepository.findOne({
        where: { hospitalId, dictKey: entity.dictKey, value: nextValue },
      });
      if (duplicated && duplicated.id !== id) {
        throw new BizError('字典项已存在').codeAs(40901);
      }
    }
    if (params.value !== undefined) entity.value = params.value;
    if (params.text !== undefined) entity.text = params.text;
    if (params.sort !== undefined) entity.sort = params.sort;
    if (params.isEnabled !== undefined) entity.isEnabled = params.isEnabled;
    if (params.operatorId) entity.updatedBy = params.operatorId;

    return await this.dictRepository.save(entity);
  }

  async deleteDictItem(
    hospitalId: string,
    id: string,
    operatorId?: string,
  ): Promise<void> {
    if (!hospitalId) throw new BizError('医院ID不能为空').codeAs(40001);
    if (!id) throw new BizError('字典ID不能为空').codeAs(40002);

    const entity = await this.dictRepository.findOne({
      where: { id, hospitalId },
    });
    if (!entity) throw new BizError('字典项不存在').codeAs(40400);

    if (operatorId) {
      entity.updatedBy = operatorId;
      await this.dictRepository.save(entity);
    }

    await this.dictRepository.delete({ id });
  }

  async findOneDictItem(hospitalId: string, id: string): Promise<HospitalDict> {
    if (!hospitalId) throw new BizError('医院ID不能为空').codeAs(40001);
    if (!id) throw new BizError('字典ID不能为空').codeAs(40002);

    const entity = await this.dictRepository.findOne({
      where: { id, hospitalId },
    });
    if (!entity) throw new BizError('字典项不存在').codeAs(40400);
    return entity;
  }

  async findDictList(
    hospitalId: string,
    params: IHospitalDictQueryParams,
  ): Promise<HospitalDict[]> {
    if (!hospitalId) throw new BizError('医院ID不能为空').codeAs(40001);
    const { dictKey, value, text, isEnabled } = params;

    const qb = this.dictRepository.createQueryBuilder('dict');
    qb.where('dict.hospitalId = :hospitalId', { hospitalId });

    if (dictKey) {
      qb.andWhere('dict.dictKey = :dictKey', { dictKey });
    }
    if (value) {
      qb.andWhere('dict.value LIKE :value', { value: `%${value}%` });
    }
    if (text) {
      qb.andWhere('dict.text LIKE :text', { text: `%${text}%` });
    }
    if (isEnabled !== undefined) {
      qb.andWhere('dict.isEnabled = :isEnabled', { isEnabled });
    }

    qb.orderBy('dict.sort', 'ASC').addOrderBy('dict.createdAt', 'DESC');

    return await qb.getMany();
  }
}
