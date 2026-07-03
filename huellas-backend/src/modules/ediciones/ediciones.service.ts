/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EdicionRevista } from './edicion-revista.entity';
import { In, Repository } from 'typeorm';
import { CreateEdicionRevistaDto } from './dtos/create-edicion-revista.dto';
import { UpdateEdicionRevistaDto } from './dtos/update-edicion-revista.dto';
import { EstadoEdicionRevista } from './estados/estado-edicion-revista.entity';
import { Articulo } from '../articulos/entities/articulo.entity';
import { DataSource } from 'typeorm';
import { PublicarEdicionRevistaDto } from './dtos/publicar-edicion-revista.dto';
import { join } from 'path';
import { promises as fs } from 'fs';
import { ArticuloHistorialEtapa } from '../articulos-historial-etapas/entities/articulos-historial-etapa.entity';
import { FerchContador } from '../articulos/entities/ferch-contador.entity';
import { User } from '../users/user.entity';
import { Tema } from '../temas/entities/tema.entity';
import { Observacion } from '../observaciones/entities/observacione.entity';
import { ObservacionArchivo } from '../observaciones-archivos/entities/observaciones-archivo.entity';

@Injectable()
export class EdicionesService {
  private static readonly ESTADO_PUBLICADA_ID = 2;
  private static readonly ETAPA_PUBLICACION_ID = 5;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(EdicionRevista)
    private edicionRepository: Repository<EdicionRevista>,
    @InjectRepository(EstadoEdicionRevista)
    private readonly estadoRepository: Repository<EstadoEdicionRevista>,
    @InjectRepository(Articulo)
    private readonly articuloRepository: Repository<Articulo>,
  ) {}

  async remove(id: number): Promise<void> {
    const edicion = await this.edicionRepository.findOne({
      where: { id },
      select: ['id', 'portada'],
    });

    if (!edicion) {
      throw new NotFoundException(`La edición con ID ${id} no existe`);
    }

    if (edicion.portada) {
      try {
        const filePath = join(process.cwd(), edicion.portada);
        await fs.unlink(filePath);
        console.log(`Portada eliminada: ${filePath}`);
      } catch (err) {
        console.warn(`No se pudo eliminar la portada: ${edicion.portada}`, err);
      }
    }

    // Eliminar el registro de la base de datos
    await this.edicionRepository.delete(id);
  }

  async findAll(): Promise<EdicionRevista[]> {
    return this.edicionRepository.find({
      relations: ['estado_id'],
      order: {
        fecha_estado: 'DESC',
        id: 'DESC',
      },
    });
  }

  // ediciones.service.ts

  async findPublicadas(): Promise<
    Array<{
      id: number;
      titulo: string;
      volumen: number;
      numero: number;
      anio: number;
      fecha_estado: Date;
      numeroArticulos: number;
      portada: string | null;
      articulos: Array<{
        id: number;
        codigo: string;
        titulo: string;
        resumen: string;
        autores: Array<{ id: number; nombre: string; correo: string }>;
        temas: string[]; // ← nuevo
        palabrasClave: string; // ← nuevo
        doi: string | null; // ← nuevo
        issn: string | null; // ← nuevo
        paginas: string | null; // ← nuevo
        fechaPublicacion: string | null; // ← nuevo (ISO string)
      }>;
    }>
  > {
    const ediciones = await this.edicionRepository.find({
      where: { estado_id: { id: EdicionesService.ESTADO_PUBLICADA_ID } as any },
      relations: [
        'estado_id',
        'articulos',
        'articulos.autores',
        'articulos.temas', // ← agregado
        'articulos.historialEtapas', // ← agregado
      ],
      order: {
        fecha_estado: 'DESC',
        anio: 'DESC',
        numero: 'DESC',
        id: 'DESC',
      },
    });

    return ediciones.map((edicion) => ({
      id: edicion.id!,
      titulo: edicion.titulo!,
      volumen: edicion.volumen!,
      numero: edicion.numero!,
      anio: edicion.anio!,
      fecha_estado: edicion.fecha_estado!,
      numeroArticulos: edicion.articulos?.length ?? 0,
      portada: edicion.portada || null,
      pdf_completo: edicion.pdf_completo || null,
      articulos: (edicion.articulos ?? []).map((articulo) => ({
        id: articulo.id,
        codigo: articulo.codigo,
        titulo: articulo.titulo,
        resumen: articulo.resumen,
        autores: [
          ...(articulo.autores ?? []).map((autor) => ({
            id: autor.id,
            nombre: autor.nombre,
            correo: autor.correo,
          })),
          ...(articulo.nombresAutoresExternos
            ? [{ id: -1, nombre: articulo.nombresAutoresExternos, correo: '' }]
            : []),
        ],
        // --- nuevos campos ---
        temas: (articulo.temas ?? []).map((tema) => tema.nombre),
        palabrasClave: articulo.palabrasClave || '',
        doi: articulo.doi || null,
        issn: articulo.issn || null,
        paginas: articulo.paginas || null,
        fechaPublicacion: this.obtenerFechaPublicacion(
          articulo.historialEtapas,
        ),
      })),
    }));
  }

  private obtenerFechaPublicacion(
    historial: ArticuloHistorialEtapa[] = [],
  ): string | null {
    const registroPublicacion = historial
      .filter((h) => h.etapaId === 5) // etapa de publicación
      .sort((a, b) => a.fechaInicio.getTime() - b.fechaInicio.getTime())[0];

    if (!registroPublicacion) {
      return null;
    }

    const fecha =
      registroPublicacion.fechaFin ?? registroPublicacion.fechaInicio;
    return fecha ? fecha.toISOString() : null;
  }

  async publicarEdicion(dto: PublicarEdicionRevistaDto) {
    const { edicionId, articuloIds } = dto;

    // 1. Validar cantidad de artículos (exactamente 10)
    const uniqueArticuloIds = [...new Set(articuloIds)];
    if (uniqueArticuloIds.length !== 10) {
      throw new BadRequestException(
        'Debes seleccionar exactamente 10 artículos.',
      );
    }

    // 2. Buscar la edición existente
    const edicion = await this.edicionRepository.findOne({
      where: { id: edicionId },
      relations: ['estado_id'],
    });

    if (!edicion) {
      throw new BadRequestException('La edición seleccionada no existe.');
    }

    // 3. Verificar que no esté ya publicada (estado_id = 2)
    if (edicion.estado_id?.id === EdicionesService.ESTADO_PUBLICADA_ID) {
      throw new BadRequestException('Esta edición ya está publicada.');
    }

    // 4. Obtener el estado PUBLICADA
    const estadoPublicada = await this.estadoRepository.findOneBy({
      id: EdicionesService.ESTADO_PUBLICADA_ID,
    });
    if (!estadoPublicada) {
      throw new InternalServerErrorException(
        'No se encontró el estado PUBLICADA.',
      );
    }

    // 5. Validar artículos
    const articulos = await this.articuloRepository.find({
      where: { id: In(uniqueArticuloIds) },
      relations: ['etapaActual'],
    });

    if (articulos.length !== uniqueArticuloIds.length) {
      throw new BadRequestException(
        'Uno o más artículos seleccionados no existen.',
      );
    }

    const articulosInvalidos = articulos.filter(
      (art) =>
        art.etapaActualId !== EdicionesService.ETAPA_PUBLICACION_ID &&
        (art.etapaActual?.nombre ?? '').toUpperCase() !== 'PUBLICACIÓN',
    );

    if (articulosInvalidos.length > 0) {
      throw new BadRequestException(
        'Todos los artículos deben estar en la etapa PUBLICACIÓN para poder publicarse.',
      );
    }

    // 6. Iniciar transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Actualizar estado de la edición
      await queryRunner.manager.update(
        EdicionRevista,
        { id: edicionId },
        { estado_id: estadoPublicada, fecha_estado: new Date() },
      );

      // Asignar los artículos a esta edición
      await queryRunner.manager.update(
        Articulo,
        { id: In(uniqueArticuloIds) },
        { edicionId: edicionId },
      );

      await queryRunner.commitTransaction();

      // Obtener la edición actualizada para la respuesta
      const edicionActualizada = await queryRunner.manager.findOne(
        EdicionRevista,
        {
          where: { id: edicionId },
        },
      );

      if (!edicionActualizada) {
        // No debería ocurrir, pero por seguridad
        throw new InternalServerErrorException(
          'No se pudo encontrar la edición después de publicarla.',
        );
      }

      return {
        message: 'Edición publicada exitosamente',
        data: {
          id: edicionActualizada.id,
          titulo: edicionActualizada.titulo,
          volumen: edicionActualizada.volumen,
          numero: edicionActualizada.numero,
          anio: edicionActualizada.anio,
          fecha_estado: edicionActualizada.fecha_estado,
          numeroArticulos: uniqueArticuloIds.length,
          articuloIds: uniqueArticuloIds,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async create(createDto: CreateEdicionRevistaDto) {
    const nuevaEdicion = new EdicionRevista();
    nuevaEdicion.titulo = createDto.titulo;
    nuevaEdicion.volumen = createDto.volumen;
    nuevaEdicion.numero = createDto.numero;
    nuevaEdicion.anio = createDto.anio;
    nuevaEdicion.fecha_estado = new Date();
    nuevaEdicion.estado_id = { id: 1 } as any;
    nuevaEdicion.portada = createDto.portada;

    return this.edicionRepository.save(nuevaEdicion);
  }

  async update(
    id: number,
    updateDto: UpdateEdicionRevistaDto,
  ): Promise<EdicionRevista> {
    const edicion = await this.edicionRepository.findOne({
      where: { id },
      relations: ['estado_id'],
    });

    if (!edicion) {
      throw new NotFoundException(`Edición con ID ${id} no encontrada`);
    }

    if (updateDto.portada === null) {
      if (edicion.portada) {
        try {
          const oldPath = join(process.cwd(), edicion.portada);
          await fs.unlink(oldPath);
        } catch (err) {
          console.warn(
            `No se pudo eliminar la portada anterior: ${edicion.portada}`,
            err,
          );
        }
        edicion.portada = undefined;
      }
      delete updateDto.portada;
    } else if (
      updateDto.portada &&
      edicion.portada &&
      edicion.portada !== updateDto.portada
    ) {
      try {
        const oldPath = join(process.cwd(), edicion.portada);
        await fs.unlink(oldPath);
      } catch (err) {
        console.warn(
          `No se pudo eliminar la portada anterior: ${edicion.portada}`,
          err,
        );
      }
      edicion.portada = updateDto.portada;
    } else if (updateDto.portada !== undefined) {
      edicion.portada = updateDto.portada;
    }

    if (updateDto.titulo !== undefined) edicion.titulo = updateDto.titulo;
    if (updateDto.volumen !== undefined) edicion.volumen = updateDto.volumen;
    if (updateDto.numero !== undefined) edicion.numero = updateDto.numero;
    if (updateDto.anio !== undefined) edicion.anio = updateDto.anio;
    if (updateDto.estado_id !== undefined) {
      const estado = await this.estadoRepository.findOneBy({
        id: updateDto.estado_id,
      });
      if (!estado) {
        throw new NotFoundException(
          `Estado con ID ${updateDto.estado_id} no encontrado`,
        );
      }
      edicion.estado_id = estado;
      edicion.fecha_estado = new Date();
    }

    return this.edicionRepository.save(edicion);
  }

  async getConteoArticulos(id: number) {
    const edicion = await this.edicionRepository.findOneBy({ id });

    if (!edicion) {
      throw new NotFoundException(`La edición con ID ${id} no existe`);
    }

    const articulosCount = await this.edicionRepository
      .createQueryBuilder('edicion')
      .leftJoin('edicion.articulos', 'articulo')
      .where('edicion.id = :id', { id })
      .select('COUNT(articulo.id)', 'conteo')
      .getRawOne();

    return {
      edicion_id: id,
      numero_articulos: parseInt(articulosCount.conteo, 10) || 0,
    };
  }

  async unpublishEdicion(id: number): Promise<{ message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Buscar la edición con su estado actual
      const edicion = await queryRunner.manager.findOne(EdicionRevista, {
        where: { id },
        relations: ['estado_id'],
      });

      if (!edicion) {
        throw new NotFoundException(`Edición con ID ${id} no encontrada`);
      }

      // 2. Verificar que esté publicada (estado_id = 2)
      if (edicion.estado_id?.id !== EdicionesService.ESTADO_PUBLICADA_ID) {
        throw new BadRequestException(
          'Solo se pueden despublicar ediciones que estén publicadas.',
        );
      }

      // 3. Obtener el estado ABIERTA (id = 1)
      const estadoAbierta = await this.estadoRepository.findOneBy({ id: 1 });
      if (!estadoAbierta) {
        throw new InternalServerErrorException(
          'No se encontró el estado ABIERTA.',
        );
      }

      // 4. Actualizar la edición: estado a ABIERTA y fecha_estado actual
      await queryRunner.manager.update(
        EdicionRevista,
        { id },
        {
          estado_id: estadoAbierta,
          fecha_estado: new Date(),
        },
      );

      // 5. Desvincular los artículos (poner edicionId = NULL)
      await queryRunner.manager.update(
        Articulo,
        { edicionId: id },
        { edicionId: null },
      );

      await queryRunner.commitTransaction();

      return {
        message:
          'Edición despublicada correctamente. Ahora está en estado ABIERTA.',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async crearPublicacionRapida(
    dto: {
      titulo: string;
      volumen: number;
      numero: number;
      anio: number;
      portadaPath?: string;
      pdfCompletoPath: string;
      articulos: Array<{
        titulo: string;
        autor_id?: string;
        otros_autores?: string;
        paginas?: string;
        doi?: string;
      }>;
      articuloFiles: Express.Multer.File[];
    },
    usuarioId: number,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Obtener estado PUBLICADA (id = 2)
      const estadoPublicada = await this.estadoRepository.findOneBy({
        id: EdicionesService.ESTADO_PUBLICADA_ID,
      });
      if (!estadoPublicada) {
        throw new InternalServerErrorException(
          'No se encontró el estado PUBLICADA.',
        );
      }

      // 2. Crear la nueva edición
      const nuevaEdicion = queryRunner.manager.create(EdicionRevista, {
        titulo: dto.titulo,
        volumen: dto.volumen,
        numero: dto.numero,
        anio: dto.anio,
        fecha_estado: new Date(),
        portada: dto.portadaPath ?? undefined,
        pdf_completo: dto.pdfCompletoPath,
        estado_id: estadoPublicada,
      });
      const edicionGuardada = await queryRunner.manager.save(nuevaEdicion);

      // 3. Buscar un tema por defecto para los artículos
      const defaultTema = await queryRunner.manager.findOne(Tema, { where: {} });
      if (!defaultTema) {
        throw new BadRequestException('No hay temas configurados en el sistema.');
      }

      // 4. Bloquear y leer el contador de artículos
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

      let ultimoNumero = contador.ultimoNumero;

      // 5. Crear cada artículo
      for (let i = 0; i < dto.articulos.length; i++) {
        const artDto = dto.articulos[i];
        const file = dto.articuloFiles[i];

        ultimoNumero++;
        const codigoArticulo = `FERCH - ${ultimoNumero}`;

        // Crear artículo con valores por defecto para evitar fricción
        const nuevoArticulo = queryRunner.manager.create(Articulo, {
          codigoNumero: ultimoNumero,
          codigo: codigoArticulo,
          titulo: artDto.titulo || `Artículo ${i + 1}`,
          resumen: 'Sin resumen disponible',
          palabrasClave: 'Revista, Huellas',
          etapaActualId: EdicionesService.ETAPA_PUBLICACION_ID,
          edicionId: edicionGuardada.id,
          nombresAutoresExternos: artDto.otros_autores || undefined,
          paginas: artDto.paginas || undefined,
          doi: artDto.doi || undefined,
        });
        const articuloGuardado = await queryRunner.manager.save(nuevoArticulo);

        // Asociar Tema
        await queryRunner.manager
          .createQueryBuilder()
          .relation(Articulo, 'temas')
          .of(articuloGuardado.id)
          .add(defaultTema.id);

        // Asociar Autor (si se proporcionó autor_id y existe, si no, usar el monitor actual)
        let autorIdToLink = usuarioId;
        if (artDto.autor_id) {
          const autorIdNum = parseInt(artDto.autor_id, 10);
          if (!isNaN(autorIdNum)) {
            const exists = await queryRunner.manager.findOne(User, {
              where: { id: autorIdNum },
              select: ['id'],
            });
            if (exists) {
              autorIdToLink = exists.id;
            }
          }
        }
        await queryRunner.manager
          .createQueryBuilder()
          .relation(Articulo, 'autores')
          .of(articuloGuardado.id)
          .add(autorIdToLink);

        // Crear Observación para el historial
        const nuevaObservacion = queryRunner.manager.create(Observacion, {
          articulo: { id: articuloGuardado.id } as any,
          usuario: { id: usuarioId } as any,
          etapa: { id: EdicionesService.ETAPA_PUBLICACION_ID } as any,
          asunto: 'Publicación Rápida',
          comentarios: 'Artículo publicado directamente a través del asistente rápido.',
        });
        const observacionGuardada = await queryRunner.manager.save(nuevaObservacion);

        // Registrar Archivo del Artículo
        const observacionArchivo = queryRunner.manager.create(ObservacionArchivo, {
          observacionesId: observacionGuardada.id,
          archivoPath: file.path,
          archivoNombreOriginal: file.originalname,
        });
        await queryRunner.manager.save(observacionArchivo);

        // Registrar Historial de Etapas
        const ahora = new Date();
        const historialEtapa = queryRunner.manager.create(ArticuloHistorialEtapa, {
          articuloId: articuloGuardado.id,
          etapaId: EdicionesService.ETAPA_PUBLICACION_ID,
          fechaInicio: ahora,
          fechaFin: ahora,
          usuarioId: usuarioId,
        });
        await queryRunner.manager.save(historialEtapa);
      }

      // 6. Actualizar contador en la BD
      await queryRunner.manager.update(
        FerchContador,
        { id: 1 },
        { ultimoNumero: ultimoNumero },
      );

      // Confirmar transacción
      await queryRunner.commitTransaction();

      return {
        message: 'Edición rápida publicada exitosamente con todos sus artículos.',
        data: {
          id: edicionGuardada.id,
          titulo: edicionGuardada.titulo,
          volumen: edicionGuardada.volumen,
          numero: edicionGuardada.numero,
          anio: edicionGuardada.anio,
          fecha_estado: edicionGuardada.fecha_estado,
          portada: edicionGuardada.portada,
          pdf_completo: edicionGuardada.pdf_completo,
          numeroArticulos: dto.articulos.length,
        },
      };
    } catch (error) {
      // Rollback DB
      await queryRunner.rollbackTransaction();

      // Borrar archivos huérfanos del disco
      if (dto.portadaPath) {
        await fs.unlink(dto.portadaPath).catch(() => null);
      }
      if (dto.pdfCompletoPath) {
        await fs.unlink(dto.pdfCompletoPath).catch(() => null);
      }
      for (const file of dto.articuloFiles) {
        if (file.path) {
          await fs.unlink(file.path).catch(() => null);
        }
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}


