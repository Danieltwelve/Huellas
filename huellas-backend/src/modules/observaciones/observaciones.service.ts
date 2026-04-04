import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { CreateEnvioObservacionesConArchivosDto } from './dto/create-observaciones-con-archivos.dto';
import { Observacion } from './entities/observacione.entity';
import { ObservacionArchivo } from '../observaciones-archivos/entities/observaciones-archivo.entity';
import { Articulo } from '../articulos/entities/articulo.entity';

interface QueryDriverError {
  code?: string;
}

@Injectable()
export class ObservacionesService {
  constructor(private readonly dataSource: DataSource) {}

  async crearEnvioObservacion(
    dto: CreateEnvioObservacionesConArchivosDto,
    archivos?: Express.Multer.File[],
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const articulo = await queryRunner.manager.findOne(Articulo, {
        where: { id: dto.articulo_id },
      });

      if (!articulo) {
        throw new NotFoundException('Artículo no encontrado');
      }

      const nuevaObservacion = queryRunner.manager.create(Observacion, {
        articuloId: dto.articulo_id,
        usuarioId: dto.usuario_id,
        etapaId: articulo.etapaActualId,
        asunto: dto.asunto,
        comentarios: dto.comentarios,
      });

      const observacionGuardada =
        await queryRunner.manager.save(nuevaObservacion);

      const archivosDesdePeticion = (archivos ?? []).map((file) => ({
        observacionesId: observacionGuardada.id,
        archivoPath: file.path,
        archivoNombreOriginal: file.originalname,
      }));

      const archivosDesdeDto = (dto.archivos ?? []).map((archivo) => ({
        observacionesId: observacionGuardada.id,
        archivoPath: archivo.archivo_path,
        archivoNombreOriginal: archivo.archivo_nombre_original,
      }));

      const archivosARegistrar =
        archivosDesdePeticion.length > 0
          ? archivosDesdePeticion
          : archivosDesdeDto;

      if (archivosARegistrar.length > 0) {
        const registrosArchivos = queryRunner.manager.create(
          ObservacionArchivo,
          archivosARegistrar,
        );
        await queryRunner.manager.save(registrosArchivos);
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Observacion registrada correctamente',
        observacionId: observacionGuardada.id,
        archivosRegistrados: archivosARegistrar.length,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof QueryFailedError) {
        const driverError = error.driverError as QueryDriverError | undefined;
        if (driverError?.code === '23503') {
          throw new BadRequestException(
            'No se pudo crear la observacion por una relacion invalida (articulo, usuario o etapa)',
          );
        }
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error al registrar la observacion. Transaccion revertida.',
      );
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return `This action returns all observaciones`;
  }

  findOne(id: number) {
    return `This action returns a #${id} observacione`;
  }

  remove(id: number) {
    return `This action removes a #${id} observacione`;
  }
}
