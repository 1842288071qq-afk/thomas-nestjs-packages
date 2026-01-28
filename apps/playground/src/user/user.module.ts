import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from '../entities/User';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // Assuming User is an entity
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
