import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tema } from './entities/tema.entity';

@Injectable()
export class TemasService {
  constructor(
    @InjectRepository(Tema)
    private readonly temaRepository: Repository<Tema>,
  ) {}

  findAll(): Promise<Tema[]> {
    return this.temaRepository.find({ order: { nombre: 'ASC' } });
  }
}
