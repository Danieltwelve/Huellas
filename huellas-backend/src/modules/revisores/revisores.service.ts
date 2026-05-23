import { Injectable } from '@nestjs/common';
import { CreateRevisoreDto } from './dto/create-revisore.dto';
import { UpdateRevisoreDto } from './dto/update-revisore.dto';

@Injectable()
export class RevisoresService {
  create(createRevisoreDto: CreateRevisoreDto) {
    return 'This action adds a new revisore';
  }

  findAll() {
    return `This action returns all revisores`;
  }

  findOne(id: number) {
    return `This action returns a #${id} revisore`;
  }

  update(id: number, updateRevisoreDto: UpdateRevisoreDto) {
    return `This action updates a #${id} revisore`;
  }

  remove(id: number) {
    return `This action removes a #${id} revisore`;
  }
}
