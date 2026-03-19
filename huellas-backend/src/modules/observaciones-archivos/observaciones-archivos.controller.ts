import { Controller, Get, Body, Param, Delete } from '@nestjs/common';
import { ObservacionesArchivosService } from './observaciones-archivos.service';

@Controller('observaciones-archivos')
export class ObservacionesArchivosController {
  constructor(
    private readonly observacionesArchivosService: ObservacionesArchivosService,
  ) {}

  @Get()
  findAll() {
    return this.observacionesArchivosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.observacionesArchivosService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.observacionesArchivosService.remove(+id);
  }
}
