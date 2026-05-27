/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { AdminCreateUserDto } from './dto/admin.create.users.dto';
import { Role } from '../roles/roles.entity';
import { UsersListQueryDto } from './dto/users-list.query.dto';

type RequestWithUser = {
  user?: {
    userId?: string | number;
  };
};

type PerfilUsuarioUpdateBody = {
  nombre?: string;
  telefono?: string;
};

@Controller('usuarios')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() query: UsersListQueryDto) {
    return this.usersService.findAll(query);
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

  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  getPerfil(@Req() req: RequestWithUser) {
    const userId = Number(req.user?.userId);
    return this.usersService.findPerfilByUsuarioId(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('perfil')
  updatePerfil(@Req() req: RequestWithUser, @Body() body: PerfilUsuarioUpdateBody) {
    const userId = Number(req.user?.userId);
    return this.usersService.updatePerfilByUsuarioId(userId, body);
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
  async createAdmin(
    @Body() adminCreateDto: AdminCreateUserDto,
    @Req() req: RequestWithUser,
  ): Promise<User> {
    const created = await this.usersService.createWithAdmin(adminCreateDto);
    this.logger.log(
      `Usuario creado por ${req.user?.userId ?? 'unknown'} con rol ${adminCreateDto.rolId}`,
    );
    return created;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor')
  @Put(':id')
  async updateUser(
    @Param('id') id: number,
    @Body() data: Partial<User>,
    @Req() req: RequestWithUser,
  ) {
    const updated = await this.usersService.update(id, data);
    this.logger.log(
      `Usuario ${id} actualizado por ${req.user?.userId ?? 'unknown'}`,
    );
    return updated;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor')
  @Post(':id/reenviar-verificacion')
  async resendVerificationEmail(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    await this.usersService.resendVerificationEmail(id);
    this.logger.log(
      `Verificacion reenviada a usuario ${id} por ${req.user?.userId ?? 'unknown'}`,
    );
    return { message: 'Correo de verificación reenviado exitosamente.' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor')
  @Post(':id/restablecer-acceso')
  async restoreAccess(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    await this.usersService.restoreFirebaseAccess(id);
    this.logger.log(
      `Acceso restablecido para usuario ${id} por ${req.user?.userId ?? 'unknown'}`,
    );
    return { message: 'Acceso restablecido y correo de recuperación enviado.' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor')
  @Delete(':id')
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    await this.usersService.deleteUser(id);
    this.logger.log(
      `Usuario ${id} eliminado por ${req.user?.userId ?? 'unknown'}`,
    );
    return { message: 'Usuario eliminado exitosamente.' };
  }
}
