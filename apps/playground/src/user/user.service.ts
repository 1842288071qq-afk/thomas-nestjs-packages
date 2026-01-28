import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/User';
import { UserDTO } from '../DTO/UserDTO';
import { IPageData } from '@app/core/Pagination';
import { LoginFormDTO, LoginResultDTO } from '../DTO/loginForm';
import { JwtIssuer } from '@app/core/nest/jwt-auth';
import { BizError } from '@app/core/BizError';

@Injectable()
export class UserService {
  private readonly nestLogger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly jwtIssuer: JwtIssuer,
  ) {}

  async get(id: string): Promise<User | null> {
    this.nestLogger.debug(id);
    return this.usersRepository.findOneBy({ id });
  }

  async create(form: UserDTO): Promise<User> {
    const user = this.usersRepository.create(form);
    return this.usersRepository.save(user);
  }
  async getUserPage(page: number, pageSize: number): Promise<IPageData<User>> {
    const [list, total] = await this.usersRepository.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { rows: list, total, page, pageSize };
  }

  async login(form: LoginFormDTO): Promise<LoginResultDTO> {
    const user = await this.usersRepository.findOneBy({ name: form.username });
    if (user && form.password === '123') {
      const result = this.jwtIssuer.issue({
        accountId: user.id,
        identityIds: [user.id],
        client: 'web',
        system: 'playground',
        expiresIn: 3600,
      });
      return { token: result.token };
    } else {
      throw new BizError('账号密码不正确').httpStatusAs(401);
    }
  }
}
