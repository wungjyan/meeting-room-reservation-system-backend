import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entites/user.entity';
import { Role } from './entites/role.entity';
import { Permission } from './entites/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Permission, Role])],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule { }
