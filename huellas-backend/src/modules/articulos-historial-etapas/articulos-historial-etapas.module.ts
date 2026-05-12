import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticulosHistorialEtapasService } from './articulos-historial-etapas.service';
import { ArticulosHistorialEtapasController } from './articulos-historial-etapas.controller';
import { ArticuloHistorialEtapa } from './entities/articulos-historial-etapa.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ArticuloHistorialEtapa])],
  controllers: [ArticulosHistorialEtapasController],
  providers: [ArticulosHistorialEtapasService],
})
export class ArticulosHistorialEtapasModule {}
