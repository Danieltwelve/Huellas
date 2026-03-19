import { Injectable } from '@nestjs/common';

@Injectable()
export class ObservacionesArchivosService {
  create() {
    return 'This action adds a new observacionesArchivo';
  }

  findAll() {
    return `This action returns all observacionesArchivos`;
  }

  findOne(id: number) {
    return `This action returns a #${id} observacionesArchivo`;
  }

  update(id: number) {
    return `This action updates a #${id} observacionesArchivo`;
  }

  remove(id: number) {
    return `This action removes a #${id} observacionesArchivo`;
  }
}
