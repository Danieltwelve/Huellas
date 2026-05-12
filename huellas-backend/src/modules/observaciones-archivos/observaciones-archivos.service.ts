import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObservacionArchivo } from './entities/observaciones-archivo.entity';
import { PaginationQueryDto } from 'src/common/dto/pagination.query.dto';

@Injectable()
export class ObservacionesArchivosService {
  constructor(
    @InjectRepository(ObservacionArchivo)
    private readonly archivosRepo: Repository<ObservacionArchivo>,
  ) {}

  async create() {
    return 'This action adds a new observacionesArchivo';
  }

  async findAll(query?: PaginationQueryDto) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 25;

    const [items, total] = await this.archivosRepo.findAndCount({
      relations: ['observacion'],
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: number) {
    return this.archivosRepo.findOne({ where: { id }, relations: ['observacion'] });
  }

  async update(id: number) {
    return `This action updates a #${id} observacionesArchivo`;
  }

  async remove(id: number) {
    await this.archivosRepo.delete(id);
    return { deleted: true };
  }
}
