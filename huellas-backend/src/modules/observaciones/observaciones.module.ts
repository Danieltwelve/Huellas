import { Module } from '@nestjs/common';
import { ObservacionesService } from './observaciones.service';
import { ObservacionesController } from './observaciones.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Observacion } from './entities/observacione.entity';
import { ObservacionArchivo } from '../observaciones-archivos/entities/observaciones-archivo.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Observacion, ObservacionArchivo]),
    StorageModule,
  ],
  controllers: [ObservacionesController],
  providers: [ObservacionesService],
})
export class ObservacionesModule {}
