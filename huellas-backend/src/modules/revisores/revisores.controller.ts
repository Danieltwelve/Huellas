/* eslint-disable prettier/prettier */
import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Put,
  Post,
  UsePipes,
  ValidationPipe,
  Req,
  UseGuards,
  Param,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RevisoresService } from './revisores.service';
import { GenerarPuntajeDto } from './dto/generar-puntaje.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import express from 'express';

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

type RegistrarRevisionBody = {
  recomendacion?: 'aceptar' | 'ajustes' | 'rechazar';
  calificacion?: number;
  comentarios?: string;
};

const REVISION_UPLOAD_MAX_SIZE = 10 * 1024 * 1024;
const REVISION_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);
const REVISION_ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.doc']);

function buildRevisionUploadOptions() {
  return {
    storage: diskStorage({
      destination: (_req: express.Request, _file: Express.Multer.File, cb) => {
        const destino = './uploads/revisiones';
        if (!existsSync(destino)) {
          mkdirSync(destino, { recursive: true });
        }

        cb(null, destino);
      },
      filename: (_req: express.Request, file: Express.Multer.File, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
    limits: {
      fileSize: REVISION_UPLOAD_MAX_SIZE,
    },
    fileFilter: (_req: express.Request, file: Express.Multer.File, cb: any) => {
      const ext = extname(file.originalname).toLowerCase();
      const isExtensionValid = REVISION_ALLOWED_EXTENSIONS.has(ext);
      const isMimeValid = REVISION_ALLOWED_MIME_TYPES.has(file.mimetype);

      if (!isExtensionValid || !isMimeValid) {
        return cb(
          new BadRequestException('Solo se permiten archivos PDF, DOC o DOCX válidos.'),
          false,
        );
      }

      cb(null, true);
    },
  };
}

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('revisor')
  @Get('mis-articulos')
  getMisArticulos(@Req() req: RequestWithUser) {
    const userId = Number(req.user?.userId);
    return this.revisoresService.getArticulosAsignadosRevisor(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('revisor')
  @Get('mis-notificaciones')
  getMisNotificaciones(@Req() req: RequestWithUser) {
    const userId = Number(req.user?.userId);
    return this.revisoresService.getNotificacionesRevisor(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('revisor')
  @Post('mis-articulos/:id/revision')
  @UseInterceptors(FileInterceptor('archivo', buildRevisionUploadOptions()))
  registrarRevision(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RegistrarRevisionBody,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    if (!body.recomendacion) {
      throw new BadRequestException('Debes seleccionar una recomendación.');
    }

    if (typeof body.calificacion !== 'number') {
      throw new BadRequestException('Debes indicar una calificación válida.');
    }

    return this.revisoresService.registrarRevisionRevisor(
      Number(req.user?.userId),
      id,
      {
        recomendacion: body.recomendacion,
        calificacion: body.calificacion,
        comentarios: body.comentarios?.trim(),
      },
      archivo,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('revisor')
  @Get('mis-revisiones')
  getMisRevisiones(@Req() req: RequestWithUser) {
    const userId = Number(req.user?.userId);
    return this.revisoresService.getHistorialRevisionRevisor(userId);
  }

  @Post('generar-puntaje')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  generarPuntaje(@Body() body: GenerarPuntajeDto) {
    return this.revisoresService.generarPuntaje(body.articuloId);
  }
}
