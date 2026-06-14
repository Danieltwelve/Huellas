import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAvisoDto } from './dto/create-aviso.dto';
import { UpdateAvisoDto } from './dto/update-aviso.dto';
import { Aviso } from './entities/aviso.entity';

@Injectable()
export class AvisosService {
  constructor(
    @InjectRepository(Aviso)
    private avisoRepository: Repository<Aviso>,
  ) {}

  async create(createAvisoDto: CreateAvisoDto): Promise<Aviso> {
    const aviso = this.avisoRepository.create({
      ...createAvisoDto,
      fecha: createAvisoDto.fecha,
    });
    return await this.avisoRepository.save(aviso);
  }

  async findAll(): Promise<Aviso[]> {
    return await this.avisoRepository.find({
      order: { fecha: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Aviso> {
    const aviso = await this.avisoRepository.findOne({ where: { id } });
    if (!aviso) {
      throw new NotFoundException(`Aviso con ID ${id} no encontrado`);
    }
    return aviso;
  }

  async update(id: number, updateAvisoDto: UpdateAvisoDto): Promise<Aviso> {
    const aviso = await this.findOne(id);
    if (updateAvisoDto.tipo !== undefined) aviso.tipo = updateAvisoDto.tipo;
    if (updateAvisoDto.titulo !== undefined)
      aviso.titulo = updateAvisoDto.titulo;
    if (updateAvisoDto.mensaje !== undefined)
      aviso.mensaje = updateAvisoDto.mensaje;
    if (updateAvisoDto.fecha !== undefined) {
      aviso.fecha = updateAvisoDto.fecha;
    }
    return await this.avisoRepository.save(aviso);
  }

  async remove(id: number): Promise<void> {
    const aviso = await this.findOne(id);
    await this.avisoRepository.remove(aviso);
  }
}
