import { Module } from '@nestjs/common';
import { ArticulosHistorialEtapasService } from './articulos-historial-etapas.service';
import { ArticulosHistorialEtapasController } from './articulos-historial-etapas.controller';

@Module({
  controllers: [ArticulosHistorialEtapasController],
  providers: [ArticulosHistorialEtapasService],
})
export class ArticulosHistorialEtapasModule {}
