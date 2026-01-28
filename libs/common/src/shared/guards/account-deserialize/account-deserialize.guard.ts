import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AccountDeserializeService } from './account-deserialize.service';

@Injectable()
export class AccountDeserializeGuard implements CanActivate {
  constructor(
    private readonly accountDeserializeService: AccountDeserializeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    await this.accountDeserializeService.deserialize(request);
    return true;
  }
}
