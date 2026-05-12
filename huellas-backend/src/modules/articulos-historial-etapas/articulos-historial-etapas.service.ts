import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticuloHistorialEtapa } from './entities/articulos-historial-etapa.entity';
import { PaginationQueryDto } from 'src/common/dto/pagination.query.dto';

@Injectable()
export class ArticulosHistorialEtapasService {
  constructor(
    @InjectRepository(ArticuloHistorialEtapa)
    private readonly historialRepo: Repository<ArticuloHistorialEtapa>,
  ) {}

  async findAll(query?: PaginationQueryDto) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 25;

    const [items, total] = await this.historialRepo.findAndCount({
      relations: ['articulo', 'etapa', 'usuario'],
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    return this.historialRepo.findOne({ where: { id } });
  }

  async remove(id: number) {
    await this.historialRepo.delete(id);
    return { deleted: true };
  }
}
