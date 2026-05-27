/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Get,
  Put,
  Post,
  UsePipes,
  ValidationPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RevisoresService } from './revisores.service';
import { GenerarPuntajeDto } from './dto/generar-puntaje.dto';

type RequestWithUser = {
  user?: {
    userId?: string | number;
  };
};

type PerfilRevisorUpdateBody = {
  nombre?: string;
  telefono?: string;
  perfilAcademico?: string;
  institucion?: string;
};

@Controller('revisores')
export class RevisoresController {
  constructor(private readonly revisoresService: RevisoresService) {}

  @Get()
  findAll() {
    return this.revisoresService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('revisor')
  @Get('perfil')
  getPerfil(@Req() req: RequestWithUser) {
    const userId = Number(req.user?.userId);
    return this.revisoresService.findPerfilByUsuarioId(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('revisor')
  @Put('perfil')
  updatePerfil(@Req() req: RequestWithUser, @Body() body: PerfilRevisorUpdateBody) {
    const userId = Number(req.user?.userId);
    return this.revisoresService.updatePerfilByUsuarioId(userId, body);
  }

  @Post('generar-puntaje')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  generarPuntaje(@Body() body: GenerarPuntajeDto) {
    return this.revisoresService.generarPuntaje(body.articuloId);
  }
}
