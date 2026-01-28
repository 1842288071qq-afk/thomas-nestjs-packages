import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Logger,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiResBody } from '@app/core/ApiResBody';
import { User } from '../entities/User';
import { UserDTO } from '../DTO/UserDTO';
import { IPageData, PaginationDTO } from '@app/core/Pagination';
import { ParseBoolGeneralPipe } from '@app/core/nest/transform/ParseBoolGeneral.pipe';
import { LoginFormDTO, LoginResultDTO } from '../DTO/loginForm';
import { Public } from '@app/core/nest/jwt-auth';

@Controller('user')
export class UserController {
  private readonly log = new Logger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @Get()
  async get(
    @Query('id') id: string,
    @Query('a', new DefaultValuePipe(false), ParseBoolGeneralPipe) a: boolean,
  ): Promise<ApiResBody<User>> {
    this.log.debug({ id, a });
    const user = await this.userService.get(id);
    if (user) {
      return ApiResBody.of(user);
    } else {
      throw new NotFoundException(ApiResBody.ofWith(404, '用户不存在'));
    }
  }

  @Get('page')
  async getUserPage(
    @Query() pagination: PaginationDTO,
  ): Promise<ApiResBody<IPageData<User>>> {
    const { page, pageSize } = pagination;
    const result = await this.userService.getUserPage(page, pageSize);
    return ApiResBody.of(result);
  }

  @Post()
  async create(@Body() form: UserDTO): Promise<ApiResBody<User>> {
    this.log.debug(form);
    const user = await this.userService.create(form);
    return ApiResBody.of(user);
  }

  @Public()
  @Post('login')
  async login(@Body() form: LoginFormDTO): Promise<ApiResBody<LoginResultDTO>> {
    // 找到用户，账号密码相同就是正确
    const loginResult = await this.userService.login(form);
    return ApiResBody.of(loginResult);
  }
}
