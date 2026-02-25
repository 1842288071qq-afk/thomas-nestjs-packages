import { Injectable } from '@nestjs/common';
import {
  ICreateOpDeptParams,
  IUpdateOpDeptParams,
  OpDeptSharedService,
} from '../../shared/services/op-dept-shared.service';
import { OpDept } from '@thomas/nestjs/entities';

@Injectable()
export class OpDeptService {
  constructor(private readonly opDeptSharedService: OpDeptSharedService) {}

  async createDept(
    params: ICreateOpDeptParams,
    createdBy?: string,
  ): Promise<OpDept> {
    return await this.opDeptSharedService.createDept({
      ...params,
      createdBy,
    });
  }

  async updateDept(id: string, params: IUpdateOpDeptParams): Promise<OpDept> {
    return await this.opDeptSharedService.updateDept(id, params);
  }

  async deleteDept(id: string): Promise<void> {
    return await this.opDeptSharedService.deleteDept(id);
  }

  async getDeptDetail(id: string): Promise<OpDept> {
    return await this.opDeptSharedService.findOneDept(id);
  }

  async getDeptList(params: {
    name?: string;
    limit?: number;
  }): Promise<OpDept[]> {
    return await this.opDeptSharedService.findDeptList(params);
  }

  async getDeptSimpleList(): Promise<OpDept[]> {
    return await this.opDeptSharedService.findDeptSimpleList();
  }
}
