import { Controller, Get, Body, Param, Delete } from '@nestjs/common';
import { ObservacionesService } from './observaciones.service';

@Controller('observaciones')
export class ObservacionesController {
  constructor(private readonly observacionesService: ObservacionesService) {}

  @Get()
  findAll() {
    return this.observacionesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.observacionesService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.observacionesService.remove(+id);
  }
}
