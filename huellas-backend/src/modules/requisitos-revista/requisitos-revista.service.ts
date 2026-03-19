import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRequisitosRevistaDto } from './dto/create-requisitos-revista.dto';
import { UpdateRequisitosRevistaDto } from './dto/update-requisitos-revista.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequisitoRevista } from './entities/requisitos-revista.entity';

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

  async findAll(): Promise<RequisitoRevista[]> {
    return this.requisitoRepository.find();
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
