/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Body,
  Controller,
  Logger,
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
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { ArticulosService } from './articulos.service';
import { FileInterceptor } from '@nestjs/platform-express';
import path, { extname } from 'path';
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
import { FIREBASE_AUTH } from 'src/common/firebase/firebase-admin.constants';
import { Auth as FirebaseAuth } from 'firebase-admin/auth';
import { UsersService } from 'src/modules/users/users.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { promises as fs } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import express from 'express';
import * as mime from 'mime-types';
import { UploadCertificadoDto } from './dto/upload-certificado.dto';
import { UpdateCertificadoDto } from './dto/update-certificado.dto';
import { GuardarChecklistDto } from './dto/guardar-checklist.dto';
import { PublicarMetadataDto } from './dto/publicar-metadata.dto';

const ARTICULO_UPLOAD_MAX_SIZE = 10 * 1024 * 1024;
const ARTICULO_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);
const ARTICULO_ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.doc']);
const CERTIFICADO_UPLOAD_MAX_SIZE = 10 * 1024 * 1024;
const CERTIFICADO_ALLOWED_MIME_TYPES = new Set(['application/pdf']);
const CERTIFICADO_ALLOWED_EXTENSIONS = new Set(['.pdf']);

function buildArticuloUploadOptions() {
  return {
    storage: diskStorage({
      destination: './uploads/articulos',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
    limits: {
      fileSize: ARTICULO_UPLOAD_MAX_SIZE,
    },
    fileFilter: (req: express.Request, file: Express.Multer.File, cb: any) => {
      const ext = extname(file.originalname).toLowerCase();
      const isExtensionValid = ARTICULO_ALLOWED_EXTENSIONS.has(ext);
      const isMimeValid = ARTICULO_ALLOWED_MIME_TYPES.has(file.mimetype);

      if (!isExtensionValid || !isMimeValid) {
        return cb(
          new BadRequestException(
            'Solo se permiten archivos PDF, DOC o DOCX válidos.',
          ),
          false,
        );
      }

      cb(null, true);
    },
  };
}

function buildCertificadoUploadOptions() {
  return {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const destino = './uploads/certificados';
        if (!existsSync(destino)) {
          mkdirSync(destino, { recursive: true });
        }

        cb(null, destino);
      },
      filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
    limits: {
      fileSize: CERTIFICADO_UPLOAD_MAX_SIZE,
    },
    fileFilter: (_req: express.Request, file: Express.Multer.File, cb: any) => {
      const ext = extname(file.originalname).toLowerCase();
      const isExtensionValid = CERTIFICADO_ALLOWED_EXTENSIONS.has(ext);
      const isMimeValid = CERTIFICADO_ALLOWED_MIME_TYPES.has(file.mimetype);

      if (!isExtensionValid || !isMimeValid) {
        return cb(
          new BadRequestException(
            'Solo se permiten certificados en formato PDF.',
          ),
          false,
        );
      }

      cb(null, true);
    },
  };
}

@Controller('articulos')
export class ArticulosController {
  private readonly logger = new Logger(ArticulosController.name);

  constructor(
    private readonly articulosService: ArticulosService,
    @Inject(FIREBASE_AUTH) private readonly firebaseAuth: FirebaseAuth,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'autor', 'comite-editorial')
  @Get('flujo/:id')
  async getArticulosFlujo(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return await this.articulosService.getArticuloFujo(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'comite-editorial')
  @Get('resumen')
  async getResumenArticulos(@Query('archivados') archivados?: string) {
    const showArchived = archivados === 'true';
    return await this.articulosService.getResumenArticulos(showArchived);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('publicacion/candidatos')
  async getArticulosEnPublicacion() {
    return await this.articulosService.getArticulosEnPublicacion();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'comite-editorial')
  @Get('estadisticas')
  async getEstadisticasGenerales() {
    return await this.articulosService.getEstadisticasGenerales();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('comite-editorial')
  @Get('comite/asignados')
  async getAsignadosComite(@Req() req: any, @Query() query?: any) {
    if (query?.page || query?.limit) {
      return await this.articulosService.getArticulosAsignadosComitePaged(
        req.user.userId,
        query,
      );
    }

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
  @Roles('admin')
  @Post(':id/certificados')
  @UseInterceptors(FileInterceptor('archivo', buildCertificadoUploadOptions()))
  async subirCertificado(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: UploadCertificadoDto,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    if (!archivo) {
      throw new BadRequestException('Debes adjuntar un archivo PDF.');
    }

    try {
      return await this.articulosService.subirCertificadoArticulo(
        id,
        req.user.userId,
        req.user.roles ?? [],
        body,
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
  @Roles('admin', 'autor', 'comite-editorial', 'revisor')
  @Get('certificados')
  async listarCertificados(@Req() req: any) {
    return await this.articulosService.listarCertificadosUsuario(
      req.user.userId,
      req.user.roles ?? [],
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'autor', 'comite-editorial', 'revisor')
  @Get('certificados/:certificadoId/descargar')
  async descargarCertificado(
    @Param('certificadoId', ParseIntPipe) certificadoId: number,
    @Req() req: any,
    @Res() res: express.Response,
  ) {
    const { stream, filename } =
      await this.articulosService.getCertificadoFileStream(
        certificadoId,
        req.user.userId,
        req.user.roles ?? [],
      );

    const mimeType = mime.lookup(filename) || 'application/pdf';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    stream.pipe(res);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('certificados/:certificadoId')
  async actualizarCertificado(
    @Param('certificadoId', ParseIntPipe) certificadoId: number,
    @Req() req: any,
    @Body() body: UpdateCertificadoDto,
  ) {
    return await this.articulosService.actualizarCertificadoArticulo(
      certificadoId,
      req.user.userId,
      req.user.roles ?? [],
      body,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('certificados/:certificadoId')
  async eliminarCertificado(
    @Param('certificadoId', ParseIntPipe) certificadoId: number,
    @Req() req: any,
  ) {
    return await this.articulosService.eliminarCertificadoArticulo(
      certificadoId,
      req.user.userId,
      req.user.roles ?? [],
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('comite-editorial')
  @Get('comite/reporte/excel')
  async descargarReporteComiteExcel(
    @Req() req: any,
    @Res() res: express.Response,
  ) {
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
  async descargarReporteComitePdf(
    @Req() req: any,
    @Res() res: express.Response,
  ) {
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
  @UseInterceptors(FileInterceptor('archivo', buildArticuloUploadOptions()))
  async crearEnvio(
    @Body() body: any,
    @UploadedFile() archivo: Express.Multer.File,
    @Req() req: any,
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

      const resultado = await this.articulosService.crearEnvioArticulo(
        dto,
        archivo.path,
        archivo.originalname,
        usuarioEmisorId,
      );

      this.logger.log(
        `Envio de articulo creado por usuario ${req.user.userId} con archivo ${archivo.originalname}`,
      );

      return resultado;
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
  @Roles('admin', 'comite-editorial', 'autor')
  @Get('configuracion/envios')
  async getEstadoEnviosArticulos() {
    return await this.articulosService.getEstadoEnviosArticulos();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'comite-editorial')
  @Patch('configuracion/envios')
  async actualizarEstadoEnviosArticulos(@Body() body: { habilitado: boolean }) {
    if (typeof body?.habilitado !== 'boolean') {
      throw new BadRequestException('El valor habilitado debe ser booleano.');
    }

    return await this.articulosService.actualizarEstadoEnviosArticulos(
      body.habilitado,
    );
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
  @Roles('admin', 'comite-editorial')
  @Get('editoriales/notificaciones')
  async getNotificacionesEditorial(@Req() req: any) {
    return await this.articulosService.getNotificacionesEditorial(
      req.user.userId,
      req.user.roles ?? [],
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('autor')
  @Post(':id/correccion')
  @UseInterceptors(FileInterceptor('archivo', buildArticuloUploadOptions()))
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
      const resultado = await this.articulosService.subirCorreccionAutor(
        id,
        req.user.userId,
        archivo,
        body.comentarios?.trim(),
      );

      this.logger.log(
        `Correccion subida por usuario ${req.user.userId} para articulo ${id}`,
      );

      return resultado;
    } catch (error) {
      if (archivo?.path) {
        await fs.unlink(archivo.path).catch(() => null);
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'comite-editorial')
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
  @Roles('admin', 'comite-editorial')
  @Post(':id/observaciones')
  @UseInterceptors(FileInterceptor('archivo', buildArticuloUploadOptions()))
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
      const resultado = await this.articulosService.agregarObservacion(
        id,
        {
          asunto: body.asunto.trim(),
          comentarios: body.comentarios?.trim(),
          etapaId: body.etapaId ? Number(body.etapaId) : undefined,
        },
        req.user.userId,
        archivo,
      );

      this.logger.log(
        `Observacion agregada por usuario ${req.user.userId} para articulo ${id}`,
      );

      return resultado;
    } catch (error) {
      if (archivo?.path) {
        await fs.unlink(archivo.path).catch(() => null);
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'comite-editorial')
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
  @Roles('admin', 'comite-editorial')
  @Patch(':id/revision-final-checklist')
  async guardarChecklist(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GuardarChecklistDto,
    @Req() req: any,
  ) {
    return await this.articulosService.guardarChecklistRevisionFinal(
      id,
      body.checklist,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/publicar-metadata')
  async guardarMetadata(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PublicarMetadataDto,
    @Req() req: any,
  ) {
    return await this.articulosService.guardarMetadataPublicacion(
      id,
      body,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/turnitin/evaluacion')
  @UseInterceptors(FileInterceptor('archivo', buildArticuloUploadOptions()))
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
      const resultado = await this.articulosService.evaluarArticuloTurnitin(
        id,
        req.user.userId,
        porcentaje,
        body.observacion?.trim(),
        archivo,
        body.decision,
      );

      this.logger.log(
        `Evaluacion de Turnitin registrada por usuario ${req.user.userId} para articulo ${id}`,
      );

      return resultado;
    } catch (error) {
      if (archivo?.path) {
        await fs.unlink(archivo.path).catch(() => null);
      }

      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/asignar-comite')
  async asignarComiteEditorial(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { comiteEditorialId: number },
    @Req() req: any,
  ) {
    if (!body.comiteEditorialId) {
      throw new BadRequestException('Debes seleccionar un miembro del comité.');
    }

    return await this.articulosService.asignarComiteEditorial(
      id,
      body.comiteEditorialId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/asignar-revisor')
  async asignarRevisor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { revisorId: number },
    @Req() req: any,
  ) {
    if (!body.revisorId) {
      throw new BadRequestException('Debes seleccionar un revisor.');
    }

    return await this.articulosService.asignarRevisor(
      id,
      body.revisorId,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id/asignar-revisor')
  async revocarRevisor(@Param('id', ParseIntPipe) id: number) {
    return await this.articulosService.revocarRevisor(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('comite-editorial')
  @Post(':id/comite/evaluacion')
  @UseInterceptors(FileInterceptor('archivo', buildArticuloUploadOptions()))
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
      const resultado = await this.articulosService.evaluarArticuloComite(
        id,
        req.user.userId,
        body.decision,
        body.observacion?.trim(),
        archivo,
      );

      this.logger.log(
        `Evaluacion de comite registrada por usuario ${req.user.userId} para articulo ${id}`,
      );

      return resultado;
    } catch (error) {
      if (archivo?.path) {
        await fs.unlink(archivo.path).catch(() => null);
      }

      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('autor')
  @Post(':id/correccion/prorroga')
  async solicitarProrrogaCorreccion(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { comentarios?: string },
  ) {
    return await this.articulosService.solicitarProrrogaCorreccionAutor(
      id,
      req.user.userId,
      body?.comentarios?.trim(),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/correccion/prorroga')
  async resolverProrrogaCorreccion(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { decision: 'aceptar' | 'rechazar'; comentarios?: string },
  ) {
    if (!body?.decision || !['aceptar', 'rechazar'].includes(body.decision)) {
      throw new BadRequestException('Debes indicar una decisión válida.');
    }

    return await this.articulosService.resolverSolicitudProrrogaCorreccion(
      id,
      req.user.userId,
      body.decision,
      body?.comentarios?.trim(),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('comite-editorial')
  @Post(':id/comite/prorroga')
  async solicitarProrrogaComite(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { comentarios?: string },
  ) {
    return await this.articulosService.solicitarProrrogaComite(
      id,
      req.user.userId,
      body?.comentarios?.trim(),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/comite/prorroga')
  async resolverProrrogaComite(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { decision: 'aceptar' | 'rechazar'; comentarios?: string },
  ) {
    if (!body?.decision || !['aceptar', 'rechazar'].includes(body.decision)) {
      throw new BadRequestException('Debes indicar una decisión válida.');
    }

    return await this.articulosService.resolverSolicitudProrrogaComite(
      id,
      req.user.userId,
      body.decision,
      body?.comentarios?.trim(),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('revisor')
  @Post(':id/revisor/prorroga')
  async solicitarProrrogaRevisor(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { comentarios?: string },
  ) {
    return await this.articulosService.solicitarProrrogaRevisor(
      id,
      req.user.userId,
      body?.comentarios?.trim(),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/revisor/prorroga')
  async resolverProrrogaRevisor(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { decision: 'aceptar' | 'rechazar'; comentarios?: string },
  ) {
    if (!body?.decision || !['aceptar', 'rechazar'].includes(body.decision)) {
      throw new BadRequestException('Debes indicar una decisión válida.');
    }

    return await this.articulosService.resolverSolicitudProrrogaRevisor(
      id,
      req.user.userId,
      body.decision,
      body?.comentarios?.trim(),
    );
  }

  @Get('descargar/:filename')
  async descargarArchivo(
    @Param('filename') filename: string,
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    try {
      // Sanitizar el nombre para evitar path traversal
      const safeName = path.basename(filename);

      let userId: number | null = null;
      let roles: string[] = [];

      // Extraer y validar el token Bearer si se proporciona
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decodedToken = await this.firebaseAuth.verifyIdToken(
            token,
            true,
          );
          if (decodedToken && decodedToken.email) {
            const user = await this.usersService.findByEmail(
              decodedToken.email,
            );
            if (user && user.estado_cuenta !== false) {
              userId = user.id;

              // Extraer roles de la misma manera que en el guard
              const tokenRoles = decodedToken.roles;
              if (Array.isArray(tokenRoles)) {
                roles = tokenRoles.filter(
                  (role): role is string => typeof role === 'string',
                );
              }
              if (roles.length === 0) {
                roles = user.roles?.map((r) => r.rol) ?? [];
              }
            }
          }
        } catch (authError) {
          this.logger.warn(
            `Intento de descarga con token inválido/expirado para archivo ${safeName}: ${authError.message}`,
          );
          // Si el token es inválido, tratamos como anónimo en lugar de arrojar error inmediatamente,
          // ya que el recurso podría ser de acceso público.
        }
      }

      // Obtener el stream a través del servicio con validación de permisos
      const stream = await this.articulosService.getArticuloFileStream(
        safeName,
        userId,
        roles,
      );

      const filePath = path.join(
        process.cwd(),
        'uploads',
        'articulos',
        safeName,
      );

      const mimeType = mime.lookup(filePath) || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeName}"`,
      );

      stream.pipe(res);

      stream.on('error', (err) => {
        console.error('Error al leer el archivo:', err);
        if (!res.headersSent) {
          res.status(500).send('Error interno al servir el archivo');
        }
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof ForbiddenException) throw error;
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor', 'comite-editorial')
  @Patch(':id/archivar')
  async archivarArticulo(
    @Param('id', ParseIntPipe) id: number,
    @Body('archivado') archivado: boolean,
  ) {
    if (typeof archivado !== 'boolean') {
      throw new BadRequestException('El valor archivado debe ser booleano.');
    }
    return await this.articulosService.archivarArticulo(id, archivado);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'director', 'monitor')
  @Get(':id/autores')
  async getAutoresArticulo(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ id: number; nombre: string }[]> {
    return this.articulosService.getAutoresArticulo(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/autores')
  async agregarAutorArticulo(
    @Param('id', ParseIntPipe) id: number,
    @Body('autorId', ParseIntPipe) autorId: number,
  ): Promise<{ message: string }> {
    return this.articulosService.agregarAutorArticulo(id, autorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id/autores/:autorId')
  async removerAutorArticulo(
    @Param('id', ParseIntPipe) id: number,
    @Param('autorId', ParseIntPipe) autorId: number,
  ): Promise<{ message: string }> {
    return this.articulosService.removerAutorArticulo(id, autorId);
  }
}
