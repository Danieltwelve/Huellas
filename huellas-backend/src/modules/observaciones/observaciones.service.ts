import { Injectable } from '@nestjs/common';

@Injectable()
export class ObservacionesService {
  findAll() {
    return `This action returns all observaciones`;
  }

  findOne(id: number) {
    return `This action returns a #${id} observacione`;
  }

  remove(id: number) {
    return `This action removes a #${id} observacione`;
  }
}
