import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiResBody } from '@qyy-code-lego/nestjs/core/ApiResBody';
import { IdentityRequired } from '../../shared/guards/identity-required/identity-required.decorator';
import { IdentityType, OpPermission } from '@qyy-code-lego/nestjs/entities';
import { OpPermissionService } from './opPermission.service';

@IdentityRequired(IdentityType.OP_USER)
@Controller('op-permission')
export class OpPermissionController {
  constructor(private readonly opPermissionService: OpPermissionService) {}

  @Get('list')
  @HttpCode(HttpStatus.OK)
  async listAll(): Promise<ApiResBody<OpPermission[]>> {
    const rows = await this.opPermissionService.listAll();
    return ApiResBody.of(rows);
  }
}
