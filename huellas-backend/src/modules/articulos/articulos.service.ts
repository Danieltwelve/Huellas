/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { DataSource, Repository } from 'typeorm';
import { CreateArticuloCompletoDto } from './dto/create-articulo-completo.dto';
import { EdicionRevista } from '../ediciones/edicion-revista.entity';
import { Articulo } from './entities/articulo.entity';
import { Observacion } from '../observaciones/entities/observacione.entity';
import { ObservacionArchivo } from '../observaciones-archivos/entities/observaciones-archivo.entity';
import { ArticuloHistorialEtapa } from '../articulos-historial-etapas/entities/articulos-historial-etapa.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FerchContador } from './entities/ferch-contador.entity';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ArticulosService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Articulo)
    private readonly articuloRepository: Repository<Articulo>,
    @InjectRepository(FerchContador)
    private readonly storageService: StorageService,
  ) {}

  async crearEnvioArticulo(
    dto: CreateArticuloCompletoDto,
    archivoPath: string,
    archivoNombreOriginal: string,
    usuarioEmisorId: number,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // --- PASO 1: Obtener FERCH - Buscar edicion_id activa ---

      const contador = await queryRunner.manager
        .createQueryBuilder(FerchContador, 'contador')
        .setLock('pessimistic_write')
        .where('id = 1')
        .getOne();

      if (!contador) {
        throw new InternalServerErrorException(
          'No se encontró el contador de artículos',
        );
      }

      const siguienteNumero = contador.ultimoNumero + 1;
      const siguienteCodigo = `FERCH - ${siguienteNumero}`;

      await queryRunner.manager.update(
        FerchContador,
        { id: 1 },
        { ultimoNumero: siguienteNumero },
      );

      const edicionActiva = await queryRunner.manager.findOne(EdicionRevista, {
        where: { estado_id: { id: 1 } } as any,
        order: { fecha_estado: 'ASC' },
      });
      if (!edicionActiva) {
        throw new BadRequestException(
          'No hay ninguna edición ABIERTA en este momento.',
        );
      }

      // --- PASO 2: Crear Artículo ---
      const palabrasClaveString = dto.palabras_clave!.join(', ');

      const nuevoArticulo = queryRunner.manager.create(Articulo, {
        codigoNumero: siguienteNumero,
        codigo: siguienteCodigo,
        titulo: dto.titulo,
        resumen: dto.resumen,
        palabrasClave: palabrasClaveString,
        etapaActualId: 1,
        edicionId: edicionActiva.id,
      });
      const articuloGuardado = await queryRunner.manager.save(nuevoArticulo);

      // 3. Insertar en articulo_temas
      await queryRunner.manager
        .createQueryBuilder()
        .relation(Articulo, 'temas') // 'temas' es la propiedad en articulo.entity.ts
        .of(articuloGuardado.id)
        .add(dto.tema_id);

      // 4. Insertar en articulo_autores
      await queryRunner.manager
        .createQueryBuilder()
        .relation(Articulo, 'autores')
        .of(articuloGuardado.id)
        .add(dto.usuarios_ids);

      // --- PASO 5: Crear Observaciones ---
      console.log('-----------------');
      const nuevaObservacion = queryRunner.manager.create(Observacion, {
        articulo: { id: articuloGuardado.id },
        usuario: { id: usuarioEmisorId },
        etapa: { id: 1 },
        asunto: dto.asunto,
        comentarios: dto.comentarios,
      });
      const observacionGuardada =
        await queryRunner.manager.save(nuevaObservacion);

      // --- PASO 6: Registrar Archivo ---
      const observacionArchivo = queryRunner.manager.create(
        ObservacionArchivo,
        {
          observacionesId: observacionGuardada.id,
          archivoPath: archivoPath,
          archivoNombreOriginal,
        },
      );
      await queryRunner.manager.save(observacionArchivo);

      // --- PASO 7: Historial de Etapas ---
      const historialEtapa = queryRunner.manager.create(
        ArticuloHistorialEtapa,
        {
          articuloId: articuloGuardado.id,
          etapaId: 1,
          fechaInicio: new Date(),
          usuarioId: usuarioEmisorId,
        },
      );
      await queryRunner.manager.save(historialEtapa);

      // FINALIZACIÓN: Confirmar transacción
      await queryRunner.commitTransaction();

      return {
        message: 'Artículo enviado y registrado correctamente',
        articuloId: articuloGuardado.id,
      };
    } catch (error) {
      // ROLLBACK: Revertir todo si hay error
      await queryRunner.rollbackTransaction();

      // Borrar archivo huérfano
      if (archivoPath) {
        try {
          await this.storageService.eliminarArchivo(archivoPath);
        } catch (error) {
          console.error(`No se pudo borrar el archivo: ${archivoPath}`, error);
        }
      }

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error crítico al registrar el envío. Transacción revertida.',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    } finally {
      // Liberar el runner
      await queryRunner.release();
    }
  }

  async getArticuloFujo(articuloId: number) {
    const articulo = await this.articuloRepository.findOne({
      where: { id: articuloId },
      relations: [
        'autores',
        'etapaActual',
        'observaciones',
        'observaciones.usuario',
        'observaciones.usuario.roles',
        'observaciones.archivos',
      ],
    });

    if (!articulo) {
      throw new BadRequestException('Artículo no encontrado');
    }

    return {
      id: articulo.id,
      codigo: articulo.codigo,
      titulo: articulo.titulo,
      etapaActual: articulo.etapaActual
        ? {
            id: articulo.etapaActual.id,
            nombre: articulo.etapaActual.nombre,
          }
        : null,
      autores: articulo.autores.map((autor) => ({
        id: autor.id,
        nombre: autor.nombre,
        email: autor.correo,
      })),
      observaciones: articulo.observaciones.map((obs) => ({
        id: obs.id,
        asunto: obs.asunto,
        comentarios: obs.comentarios,
        fechaSubida: obs.fechaSubida,
        usuario: obs.usuario
          ? {
              id: obs.usuario.id,
              nombre: obs.usuario.nombre,
              email: obs.usuario.correo,
              roles: obs.usuario.roles.map((role) => ({
                id: role.id,
                nombre: role.rol,
              })),
            }
          : null,
        archivos: obs.archivos.map((arch) => ({
          id: arch.id,
          archivoPath: arch.archivoPath,
          archivoNombreOriginal: arch.archivoNombreOriginal,
        })),
      })),
    };
  }

  async getResumenArticulos() {
    const articulos = await this.articuloRepository
      .createQueryBuilder('articulo')
      .select(['articulo.id', 'articulo.codigo', 'articulo.titulo'])
      .innerJoin('articulo.etapaActual', 'etapa')
      .addSelect(['etapa.nombre'])

      .innerJoin(
        'articulo.historialEtapas',
        'historial',
        'historial.etapaId = :etapaBuscada',
        { etapaBuscada: 1 },
      )
      .addSelect(['historial.fechaInicio'])
      .orderBy('historial.fechaInicio', 'DESC')
      .getMany();

    return articulos.map((articulo) => ({
      id: articulo.id,
      codigo: articulo.codigo,
      titulo: articulo.titulo,
      etapa_nombre: articulo.etapaActual?.nombre || 'Desconocida',
      fecha_inicio: articulo.historialEtapas[0]?.fechaInicio || null,
    }));
  }

  async getArticulosPorAutor(userId: number) {
    const articulos = await this.articuloRepository
      .createQueryBuilder('articulo')
      .select(['articulo.id', 'articulo.codigo', 'articulo.titulo'])
      .innerJoin('articulo.autores', 'autor', 'autor.id = :userId', { userId })
      .leftJoinAndSelect('articulo.etapaActual', 'etapa')
      .leftJoinAndSelect('articulo.historialEtapas', 'historial')
      .orderBy('historial.fechaInicio', 'DESC')
      .getMany();

    return articulos.map((articulo) => ({
      id: articulo.id,
      codigo: articulo.codigo,
      titulo: articulo.titulo,
      etapa_nombre: articulo.etapaActual?.nombre || 'Desconocida',
      fecha_inicio: articulo.historialEtapas[0]?.fechaInicio || null,
    }));
  }

  async getArticuloFileStream(
    filename: string,
    userId: number,
    userRoles: string[],
  ): Promise<NodeJS.ReadableStream> {
    const archivo = await this.dataSource
      .getRepository(ObservacionArchivo)
      .createQueryBuilder('oa')
      .innerJoinAndSelect('oa.observacion', 'obs')
      .innerJoinAndSelect('obs.articulo', 'articulo')
      .leftJoinAndSelect('articulo.autores', 'autor')
      .where('oa.archivoPath LIKE :suffix', { suffix: `%${filename}` })
      .getOne();

    if (!archivo) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const articulo = archivo.observacion?.articulo;
    if (!articulo) {
      throw new NotFoundException('Artículo asociado no encontrado');
    }

    const esAdmin = userRoles.includes('admin');
    const esDirector = userRoles.includes('director');
    const esMonitor = userRoles.includes('monitor');
    const esAutor =
      articulo.autores?.some((autor) => autor.id === userId) ?? false;

    if (!esAdmin && !esAutor && !esDirector && !esMonitor) {
      throw new ForbiddenException(
        'No tienes permiso para descargar este archivo',
      );
    }

    const filePath = archivo.archivoPath;
    if (!existsSync(filePath)) {
      throw new NotFoundException('El archivo no existe en el servidor');
    }

    return createReadStream(filePath);
  }

  async eliminarArticulo(articuloId: number) {
    const articulo = await this.articuloRepository.findOne({
      where: { id: articuloId },
      relations: [
        'temas',
        'autores',
        'observaciones',
        'observaciones.archivos',
      ],
    });

    if (!articulo) {
      throw new NotFoundException(
        `El artículo con ID ${articuloId} no existe.`,
      );
    }

    const observacionesIds: number[] = [];
    const archivosFisicos: string[] = [];

    articulo.observaciones.forEach((obs) => {
      observacionesIds.push(obs.id);
      obs.archivos.forEach((archivo) => {
        if (archivo.archivoPath) archivosFisicos.push(archivo.archivoPath);
      });
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();

    try {
      if (observacionesIds.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(ObservacionArchivo)
          .where('observacionesId IN (:...ids)', { ids: observacionesIds })
          .execute();
      }

      await queryRunner.manager.delete(Observacion, {
        articuloId: articulo.id,
      });

      await queryRunner.manager.delete(ArticuloHistorialEtapa, {
        articuloId: articulo.id,
      });

      if (articulo.temas && articulo.temas.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .relation(Articulo, 'temas')
          .of(articulo.id)
          .remove(articulo.temas.map((tema) => tema.id));
      }

      if (articulo.autores && articulo.autores.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .relation(Articulo, 'autores')
          .of(articulo.id)
          .remove(articulo.autores.map((autor) => autor.id));
      }

      await queryRunner.manager.delete(Articulo, { id: articulo.id });

      await queryRunner.commitTransaction();

      for (const path of archivosFisicos) {
        await this.storageService.eliminarArchivo(path);
      }

      return {
        message: 'Artículo y todas sus dependencias eliminadas correctamente',
        id_eliminado: articuloId,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        'Error crítico al eliminar el artículo.',
        error instanceof Error ? error.message : 'Error desconocido',
      );
    } finally {
      await queryRunner.release();
    }
  }
}
