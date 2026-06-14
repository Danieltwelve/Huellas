import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ObservacionesService } from './observaciones.service';

@Controller('observaciones')
export class ObservacionesController {
  constructor(private readonly observacionesService: ObservacionesService) {}

  @Get('articulo/:articuloId/ultima-version')
  async getUltimaVersionArticulo(
    @Param('articuloId', ParseIntPipe) articuloId: number,
  ) {
    return this.observacionesService.getUltimaVersionAutor(articuloId);
  }
}
