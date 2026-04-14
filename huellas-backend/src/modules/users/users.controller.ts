import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { AdminCreateUserDto } from './dto/admin.create.users.dto';
import { Role } from '../roles/roles.entity';

@Controller('usuarios')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get('autores')
  async getAutores() {
    return this.usersService.findAutores();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor')
  @Get('comite-editorial')
  async getCommitteeMembers(): Promise<User[]> {
    return this.usersService.findCommitteeMembers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor')
  @Get('roles')
  async findAvailableRoles(): Promise<Role[]> {
    return this.usersService.findAvailableRoles();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<User> {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    return user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor')
  @Post()
  async createAdmin(@Body() adminCreateDto: AdminCreateUserDto): Promise<User> {
    return this.usersService.createWithAdmin(adminCreateDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor')
  @Put(':id')
  async updateUser(@Param('id') id: number, @Body() data: Partial<User>) {
    return this.usersService.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor')
  @Post(':id/reenviar-verificacion')
  async resendVerificationEmail(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.resendVerificationEmail(id);
    return { message: 'Correo de verificación reenviado exitosamente.' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor')
  @Post(':id/restablecer-acceso')
  async restoreAccess(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.restoreFirebaseAccess(id);
    return { message: 'Acceso restablecido y correo de recuperación enviado.' };
  }
}
