import { Injectable } from '@nestjs/common';
import { OpPermission } from '@qyy-code-lego/nestjs/entities';
import { OpRoleSharedService } from '../../shared/services/op-role-shared.service';

@Injectable()
export class OpPermissionService {
  constructor(private readonly opRoleSharedService: OpRoleSharedService) {}

  async listAll(): Promise<OpPermission[]> {
    return await this.opRoleSharedService.getAvailablePermissions();
  }
}
