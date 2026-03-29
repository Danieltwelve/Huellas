/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EdicionRevista } from './edicion-revista.entity';
import { Repository } from 'typeorm';
import { CreateEdicionRevistaDto } from './dtos/create-edicion-revista.dto';
import { UpdateEdicionRevistaDto } from './dtos/update-edicion-revista.dto';
import { EstadoEdicionRevista } from './estados/estado-edicion-revista.entity';

@Injectable()
export class EdicionesService {
  constructor(
    @InjectRepository(EdicionRevista)
    private edicionRepository: Repository<EdicionRevista>,
    @InjectRepository(EstadoEdicionRevista)
    private readonly estadoRepository: Repository<EstadoEdicionRevista>,
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
