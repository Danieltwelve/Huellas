import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRequisitosRevistaDto } from './dto/create-requisitos-revista.dto';
import { UpdateRequisitosRevistaDto } from './dto/update-requisitos-revista.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequisitoRevista } from './entities/requisitos-revista.entity';

export interface RequisitosPageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RequisitosPageResponse {
  items: RequisitoRevista[];
  meta: RequisitosPageMeta;
}

@Injectable()
export class RequisitosRevistaService {
  constructor(
    @InjectRepository(RequisitoRevista)
    private readonly requisitoRepository: Repository<RequisitoRevista>,
  ) {}

  async create(
    createDto: CreateRequisitosRevistaDto,
  ): Promise<RequisitoRevista> {
    const nuevo = this.requisitoRepository.create(createDto);
    return this.requisitoRepository.save(nuevo);
  }

  async findAll(pageValue?: string, limitValue?: string): Promise<RequisitosPageResponse> {
    const page = Math.max(1, Number(pageValue) || 1);
    const limit = Math.min(100, Math.max(1, Number(limitValue) || 20));

    const [items, total] = await this.requisitoRepository.findAndCount({
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: number): Promise<RequisitoRevista> {
    const requisito = await this.requisitoRepository.findOneBy({ id });
    if (!requisito) {
      throw new NotFoundException(`Requisito con ID ${id} no encontrado`);
    }
    return requisito;
  }

  async update(
    id: number,
    updateDto: UpdateRequisitosRevistaDto,
  ): Promise<RequisitoRevista> {
    const requisito = await this.findOne(id);
    Object.assign(requisito, updateDto);
    return this.requisitoRepository.save(requisito);
  }

  async remove(id: number): Promise<void> {
    const requisito = await this.findOne(id);
    await this.requisitoRepository.remove(requisito);
  }
}
