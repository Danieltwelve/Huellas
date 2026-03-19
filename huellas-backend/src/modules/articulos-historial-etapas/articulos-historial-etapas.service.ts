import { Injectable } from '@nestjs/common';

@Injectable()
export class ArticulosHistorialEtapasService {
  findAll() {
    return `This action returns all articulosHistorialEtapas`;
  }

  findOne(id: number) {
    return `This action returns a #${id} articulosHistorialEtapa`;
  }

  remove(id: number) {
    return `This action removes a #${id} articulosHistorialEtapa`;
  }
}
