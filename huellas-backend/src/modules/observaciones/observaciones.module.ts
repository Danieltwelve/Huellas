import { Module } from '@nestjs/common';
import { ObservacionesService } from './observaciones.service';
import { ObservacionesController } from './observaciones.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Observacion } from './entities/observacione.entity';
import { Articulo } from '../articulos/entities/articulo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Observacion, Articulo])],
  controllers: [ObservacionesController],
  providers: [ObservacionesService],
})
export class ObservacionesModule {}
