/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { promises as fs } from 'fs';
import { DataSource, Repository } from 'typeorm';
import { CreateArticuloCompletoDto } from './dto/create-articulo-completo.dto';
import { EdicionRevista } from '../ediciones/edicion-revista.entity';
import { Articulo } from './entities/articulo.entity';
import { Observacion } from '../observaciones/entities/observacione.entity';
import { ObservacionArchivo } from '../observaciones-archivos/entities/observaciones-archivo.entity';
import { ArticuloHistorialEtapa } from '../articulos-historial-etapas/entities/articulos-historial-etapa.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ArticulosService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Articulo)
    private readonly articuloRepository: Repository<Articulo>,
  ) {}
  async crearEnvioArticulo(
    dto: CreateArticuloCompletoDto,
    archivoPath: string,
    usuarioEmisorId: number,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // --- PASO 1: Buscar edicion_id activa ---
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
          await fs.unlink(archivoPath);
        } catch (unlinkError) {
          console.error(
            `No se pudo borrar el archivo: ${archivoPath}`,
            unlinkError,
          );
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
}
