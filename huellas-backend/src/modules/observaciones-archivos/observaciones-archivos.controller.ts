import { Controller, Get, Body, Param, Delete, Query } from '@nestjs/common';
import { ObservacionesArchivosService } from './observaciones-archivos.service';
import { PaginationQueryDto } from 'src/common/dto/pagination.query.dto';

@Controller('observaciones-archivos')
export class ObservacionesArchivosController {
  constructor(
    private readonly observacionesArchivosService: ObservacionesArchivosService,
  ) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.observacionesArchivosService.findAll(query);
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
