/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EdicionRevista } from './edicion-revista.entity';
import { In, Repository } from 'typeorm';
import { CreateEdicionRevistaDto } from './dtos/create-edicion-revista.dto';
import { UpdateEdicionRevistaDto } from './dtos/update-edicion-revista.dto';
import { EstadoEdicionRevista } from './estados/estado-edicion-revista.entity';
import { Articulo } from '../articulos/entities/articulo.entity';
import { DataSource } from 'typeorm';
import { PublicarEdicionRevistaDto } from './dtos/publicar-edicion-revista.dto';

@Injectable()
export class EdicionesService {
  private static readonly ESTADO_PUBLICADA_ID = 3;
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
    const edicion = await this.edicionRepository.findOneBy({ id });
    if (!edicion) {
      throw new NotFoundException(`La edición con ID ${id} no existe`);
    }
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

  async findPublicadas(): Promise<Array<{
    id: number;
    titulo: string;
    volumen: number;
    numero: number;
    anio: number;
    fecha_estado: Date;
    numeroArticulos: number;
    articulos: Array<{ id: number; codigo: string; titulo: string }>;
  }>> {
    const ediciones = await this.edicionRepository.find({
      where: { estado_id: { id: EdicionesService.ESTADO_PUBLICADA_ID } as any },
      relations: ['estado_id', 'articulos'],
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
      articulos: (edicion.articulos ?? []).map((articulo) => ({
        id: articulo.id,
        codigo: articulo.codigo,
        titulo: articulo.titulo,
      })),
    }));
  }

  async publicarEdicion(dto: PublicarEdicionRevistaDto) {
    const articuloIds = [...new Set(dto.articuloIds)];

    if (articuloIds.length !== 10) {
      throw new BadRequestException('Debes seleccionar exactamente 10 artículos.');
    }

    const estadoPublicada = await this.estadoRepository.findOneBy({
      id: EdicionesService.ESTADO_PUBLICADA_ID,
    });

    if (!estadoPublicada) {
      throw new InternalServerErrorException('No se encontró el estado PUBLICADA.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const articulos = await queryRunner.manager.find(Articulo, {
        where: { id: In(articuloIds) },
        relations: ['etapaActual'],
      });

      if (articulos.length !== articuloIds.length) {
        throw new BadRequestException('Uno o más artículos seleccionados no existen.');
      }

      const articulosInvalidos = articulos.filter(
        (articulo) =>
          articulo.etapaActualId !== EdicionesService.ETAPA_PUBLICACION_ID &&
          (articulo.etapaActual?.nombre ?? '').toUpperCase() !== 'PUBLICACIÓN',
      );

      if (articulosInvalidos.length > 0) {
        throw new BadRequestException(
          'Todos los artículos deben estar en la etapa PUBLICACIÓN para poder publicarse.',
        );
      }

      const nuevaEdicion = queryRunner.manager.create(EdicionRevista, {
        titulo: dto.titulo,
        volumen: dto.volumen,
        numero: dto.numero,
        anio: dto.anio,
        fecha_estado: dto.fechaEstado ? new Date(dto.fechaEstado) : new Date(),
        estado_id: estadoPublicada,
      });

      const edicionGuardada = await queryRunner.manager.save(nuevaEdicion);

      await queryRunner.manager.update(
        Articulo,
        { id: In(articuloIds) },
        { edicionId: edicionGuardada.id! },
      );

      await queryRunner.commitTransaction();

      return {
        message: 'Edición publicada exitosamente',
        data: {
          id: edicionGuardada.id,
          titulo: edicionGuardada.titulo,
          volumen: edicionGuardada.volumen,
          numero: edicionGuardada.numero,
          anio: edicionGuardada.anio,
          fecha_estado: edicionGuardada.fecha_estado,
          numeroArticulos: articuloIds.length,
          articuloIds,
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
    const nuevaEdicion = this.edicionRepository.create({
      ...createDto,
      estado_id: { id: 1 },
    });
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

    if (updateDto.titulo !== undefined) {
      edicion.titulo = updateDto.titulo;
    }
    if (updateDto.volumen !== undefined) {
      edicion.volumen = updateDto.volumen;
    }
    if (updateDto.numero !== undefined) {
      edicion.numero = updateDto.numero;
    }
    if (updateDto.anio !== undefined) {
      edicion.anio = updateDto.anio;
    }

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
}
