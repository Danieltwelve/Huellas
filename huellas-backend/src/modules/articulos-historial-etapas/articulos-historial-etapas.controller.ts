import { Controller, Get, Body, Param, Delete, Query } from '@nestjs/common';
import { ArticulosHistorialEtapasService } from './articulos-historial-etapas.service';
import { PaginationQueryDto } from 'src/common/dto/pagination.query.dto';

@Controller('articulos-historial-etapas')
export class ArticulosHistorialEtapasController {
  constructor(
    private readonly articulosHistorialEtapasService: ArticulosHistorialEtapasService,
  ) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.articulosHistorialEtapasService.findAll(query);
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
