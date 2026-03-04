import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create.users.dto';
import { Role } from '../roles/roles.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const newUser = this.userRepository.create(createUserDto);
    const defaultRole = await this.rolesRepository.findOne({
      where: { rol: 'admin' },
    });
    if (defaultRole) {
      newUser.roles = [defaultRole];
    }
    return this.userRepository.save(newUser);
  }

  async findByEmail(correo: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { correo },
      relations: ['roles'],
    });
  }
}
