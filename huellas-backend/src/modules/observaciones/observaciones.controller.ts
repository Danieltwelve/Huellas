import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { validateOrReject, ValidationError } from 'class-validator';
import { ObservacionesService } from './observaciones.service';
import { MaxTotalFilesSizePipe } from './pipes/max-total-files-size.pipe';
import {
  ArchivoObservacionInputDto,
  CreateEnvioObservacionesConArchivosDto,
} from './dto/create-observaciones-con-archivos.dto';
import { StorageService } from '../storage/storage.service';

@Controller('observaciones')
export class ObservacionesController {
  constructor(
    private readonly observacionesService: ObservacionesService,
    private readonly storageService: StorageService,
  ) {}

  @Post('envio')
  @UseInterceptors(
    FilesInterceptor('archivos', 20, {
      storage: diskStorage({
        destination: './uploads/observaciones',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
        fieldSize: 20 * 1024 * 1024,
      },
    }),
  )
  async crearEnvio(
    @Body() body: Record<string, unknown>,
    @UploadedFiles(new MaxTotalFilesSizePipe())
    archivos?: Express.Multer.File[],
  ) {
    const dto = Object.assign(new CreateEnvioObservacionesConArchivosDto(), {
      ...body,
      articulo_id:
        typeof body.articulo_id === 'string'
          ? Number(body.articulo_id)
          : body.articulo_id,
      usuario_id:
        typeof body.usuario_id === 'string'
          ? Number(body.usuario_id)
          : body.usuario_id,
      etapa_id:
        typeof body.etapa_id === 'string'
          ? Number(body.etapa_id)
          : body.etapa_id,
    });

    if (archivos && archivos.length > 0) {
      dto.archivos = archivos.map((archivo) => {
        const archivoDto = new ArchivoObservacionInputDto();
        archivoDto.archivo_path = archivo.path;
        archivoDto.archivo_nombre_original = archivo.originalname;
        return archivoDto;
      });
    }

    try {
      await validateOrReject(dto);
      return await this.observacionesService.crearEnvioObservacion(
        dto,
        archivos,
      );
    } catch (error) {
      console.log('DETALLE DEL ERROR:', JSON.stringify(error, null, 2));
      if (archivos?.length) {
        await Promise.all(
          archivos.map((archivo) =>
            this.storageService.eliminarArchivo(archivo.path),
          ),
        );
      }

      if (
        Array.isArray(error) &&
        error.length > 0 &&
        error[0] instanceof ValidationError
      ) {
        const validationErrors = error as ValidationError[];
        throw new BadRequestException({
          message: 'Error en la validacion de los datos',
          errors: validationErrors.map((err) => err.constraints),
        });
      }

      throw error;
    }
  }

  @Get()
  findAll() {
    return this.observacionesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.observacionesService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.observacionesService.remove(+id);
  }
}
