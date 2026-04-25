/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
  Param,
  ParseIntPipe,
  Delete,
  Res,
  Query,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ArticulosService } from './articulos.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { CreateArticuloCompletoDto } from './dto/create-articulo-completo.dto';
import { AddObservacionDto } from './dto/add-observacion.dto';
import { CambiarEtapaDto } from './dto/cambiar-etapa.dto';
import { SubmitCorreccionDto } from './dto/submit-correccion.dto';
import { AceptarCorreccionDto } from './dto/aceptar-correccion.dto';
import { EvaluarComiteDto } from './dto/evaluar-comite.dto';
import { EvaluarTurnitinDto } from './dto/evaluar-turnitin.dto';
import { diskStorage } from 'multer';
import { validateOrReject, ValidationError } from 'class-validator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { promises as fs } from 'fs';
import express from 'express';
import * as mime from 'mime-types';

@Controller('articulos')
export class ArticulosController {
  constructor(private readonly articulosService: ArticulosService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'autor', 'director', 'monitor', 'comite-editorial')
  @Get('flujo/:id')
  async getArticulosFlujo(@Param('id', ParseIntPipe) id: number) {
    return await this.articulosService.getArticuloFujo(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'monitor', 'director', 'comite-editorial')
  @Get('resumen')
  async getResumenArticulos() {
    return await this.articulosService.getResumenArticulos();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('comite-editorial')
  @Get('comite/asignados')
  async getAsignadosComite(@Req() req: any) {
    return await this.articulosService.getArticulosAsignadosComite(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('comite-editorial')
  @Get('comite/mis-evaluaciones')
  async getMisEvaluacionesComite(@Req() req: any) {
    return await this.articulosService.getHistorialEvaluacionesComite(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('comite-editorial')
  @Get('comite/estadisticas')
  async getEstadisticasComite(@Req() req: any) {
    return await this.articulosService.getEstadisticasComite(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('comite-editorial')
  @Get('comite/notificaciones-vencimiento')
  async getNotificacionesVencimientoComite(@Req() req: any) {
    return await this.articulosService.getNotificacionesVencimientoComite(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('comite-editorial')
  @Get('comite/reporte/excel')
  async descargarReporteComiteExcel(@Req() req: any, @Res() res: express.Response) {
    const buffer = await this.articulosService.generarReporteComiteExcel(
      req.user.userId,
    );

    const nombre = `reporte-comite-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(buffer);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('comite-editorial')
  @Get('comite/reporte/pdf')
  async descargarReporteComitePdf(@Req() req: any, @Res() res: express.Response) {
    const buffer = await this.articulosService.generarReporteComitePdf(
      req.user.userId,
    );

    const nombre = `reporte-comite-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(buffer);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('comite-editorial')
  @Get('comite/reporte')
  async getReporteComite(@Req() req: any, @Query('tipo') tipo?: string) {
    if (tipo === 'historial') {
      return await this.articulosService.getHistorialEvaluacionesComite(
        req.user.userId,
      );
    }

    return await this.articulosService.getArticulosAsignadosComite(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'autor')
  @Post('envio')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({
        destination: './uploads/articulos',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async crearEnvio(
    @Body() body: any,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    if (!archivo) {
      throw new BadRequestException(
        'Es obligatorio adjuntar el archivo del artículo',
      );
    }

    try {
      const dto = new CreateArticuloCompletoDto();
      dto.titulo = body.titulo;
      dto.resumen = body.resumen;
      dto.asunto = body.asunto;
      dto.comentarios = body.comentarios;

      dto.tema_id = Number(body.tema_id);

      dto.palabras_clave =
        typeof body.palabras_clave === 'string'
          ? body.palabras_clave.split(',').map((s) => s.trim())
          : body.palabras_clave;

      if (body.usuarios_ids !== undefined && body.usuarios_ids !== '') {
        dto.usuarios_ids =
          typeof body.usuarios_ids === 'string'
            ? body.usuarios_ids.split(',').map((id) => Number(id.trim()))
            : body.usuarios_ids;

        if (dto.usuarios_ids.some((id) => isNaN(id))) {
          throw new BadRequestException(
            'Los usuarios_ids deben ser números válidos',
          );
        }
      }

      await validateOrReject(dto);

      const usuarioEmisorId = dto.usuarios_ids[0];

      return await this.articulosService.crearEnvioArticulo(
        dto,
        archivo.path,
        archivo.originalname,
        usuarioEmisorId,
      );
    } catch (error) {
      if (archivo && archivo.path) {
        await fs.unlink(archivo.path).catch(() => null);
      }

      if (
        Array.isArray(error) &&
        error.length > 0 &&
        error[0] instanceof ValidationError
      ) {
        const validationErrors = error as ValidationError[];
        throw new BadRequestException({
          message: 'Error en la validación de los datos',
          errors: validationErrors.map((err) => err.constraints),
        });
      }

      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('autor')
  @Get('mis-articulos')
  async getMisArticulos(@Req() req: any) {
    const userId = req.user.userId;
    return await this.articulosService.getArticulosPorAutor(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('autor')
  @Get('mis-notificaciones')
  async getMisNotificaciones(@Req() req: any) {
    const userId = req.user.userId;
    return await this.articulosService.getNotificacionesAutor(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('autor')
  @Post(':id/correccion')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({
        destination: './uploads/articulos',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async subirCorreccion(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: SubmitCorreccionDto,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    if (!archivo) {
      throw new BadRequestException(
        'Debes adjuntar un archivo para enviar la corrección',
      );
    }

    try {
      return await this.articulosService.subirCorreccionAutor(
        id,
        req.user.userId,
        archivo,
        body.comentarios?.trim(),
      );
    } catch (error) {
      if (archivo?.path) {
        await fs.unlink(archivo.path).catch(() => null);
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor', 'comite-editorial')
  @Post(':id/correcciones/:observacionId/aceptar')
  async aceptarCorreccionAutor(
    @Param('id', ParseIntPipe) id: number,
    @Param('observacionId', ParseIntPipe) observacionId: number,
    @Body() body: AceptarCorreccionDto,
    @Req() req: any,
  ) {
    return await this.articulosService.aceptarCorreccionAutor(
      id,
      observacionId,
      req.user.userId,
      body.comentarios?.trim(),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor', 'comite-editorial')
  @Post(':id/observaciones')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({
        destination: './uploads/articulos',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async agregarObservacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AddObservacionDto,
    @Req() req: any,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    if (!body.asunto || body.asunto.trim().length === 0) {
      if (archivo?.path) {
        await fs.unlink(archivo.path).catch(() => null);
      }
      throw new BadRequestException(
        'El asunto de la observación es obligatorio',
      );
    }

    try {
      return await this.articulosService.agregarObservacion(
        id,
        {
          asunto: body.asunto.trim(),
          comentarios: body.comentarios?.trim(),
          etapaId: body.etapaId ? Number(body.etapaId) : undefined,
        },
        req.user.userId,
        archivo,
      );
    } catch (error) {
      if (archivo?.path) {
        await fs.unlink(archivo.path).catch(() => null);
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor', 'comite-editorial')
  @Patch(':id/etapa')
  async cambiarEtapa(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CambiarEtapaDto,
    @Req() req: any,
  ) {
    return await this.articulosService.cambiarEtapaArticulo(
      id,
      body.etapaId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor')
  @Post(':id/turnitin/evaluacion')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({
        destination: './uploads/articulos',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async evaluarTurnitin(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EvaluarTurnitinDto,
    @Req() req: any,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    const porcentaje = Number(body.porcentaje);

    if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      if (archivo?.path) {
        await fs.unlink(archivo.path).catch(() => null);
      }

      throw new BadRequestException(
        'El porcentaje de Turnitin debe estar entre 0 y 100.',
      );
    }

    try {
      return await this.articulosService.evaluarArticuloTurnitin(
        id,
        req.user.userId,
        porcentaje,
        body.observacion?.trim(),
        archivo,
      );
    } catch (error) {
      if (archivo?.path) {
        await fs.unlink(archivo.path).catch(() => null);
      }

      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor')
  @Post(':id/asignar-comite')
  async asignarComiteEditorial(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { comiteEditorialId: number },
  ) {
    if (!body.comiteEditorialId) {
      throw new BadRequestException('Debes seleccionar un miembro del comité.');
    }

    return await this.articulosService.asignarComiteEditorial(
      id,
      body.comiteEditorialId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('comite-editorial')
  @Post(':id/comite/evaluacion')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({
        destination: './uploads/articulos',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async evaluarPorComite(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EvaluarComiteDto,
    @Req() req: any,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    if (body.decision === 'rechazar' && !body.observacion?.trim()) {
      if (archivo?.path) {
        await fs.unlink(archivo.path).catch(() => null);
      }

      throw new BadRequestException(
        'Debes agregar una observación cuando rechazas un artículo.',
      );
    }

    try {
      return await this.articulosService.evaluarArticuloComite(
        id,
        req.user.userId,
        body.decision,
        body.observacion?.trim(),
        archivo,
      );
    } catch (error) {
      if (archivo?.path) {
        await fs.unlink(archivo.path).catch(() => null);
      }

      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('autor', 'monitor', 'director', 'admin', 'comite-editorial')
  @Get('descargar/:filename')
  async descargarArchivo(
    @Param('filename') filename: string,
    @Req() req: any,
    @Res() res: express.Response,
  ) {
    try {
      const userId = req.user.userId;
      const userRoles = req.user.roles || [];

      const fileStream = await this.articulosService.getArticuloFileStream(
        filename,
        userId,
        userRoles,
      );

      const mimeType = mime.lookup(filename) || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      fileStream.pipe(res);

      fileStream.on('error', (err) => {
        console.error('Error al leer el archivo:', err);
        if (!res.headersSent) {
          res.status(500).send('Error interno al servir el archivo');
        }
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException('Error al descargar el archivo');
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async eliminarArticulo(@Param('id', ParseIntPipe) id: number) {
    return await this.articulosService.eliminarArticulo(id);
  }
}
