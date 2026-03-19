import { Controller, Get, Body, Param, Delete } from '@nestjs/common';
import { ArticulosHistorialEtapasService } from './articulos-historial-etapas.service';

@Controller('articulos-historial-etapas')
export class ArticulosHistorialEtapasController {
  constructor(
    private readonly articulosHistorialEtapasService: ArticulosHistorialEtapasService,
  ) {}

  @Get()
  findAll() {
    return this.articulosHistorialEtapasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.articulosHistorialEtapasService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.articulosHistorialEtapasService.remove(+id);
  }
}
