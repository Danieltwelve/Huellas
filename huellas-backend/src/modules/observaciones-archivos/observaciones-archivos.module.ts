import { Module } from '@nestjs/common';
import { ObservacionesArchivosService } from './observaciones-archivos.service';
import { ObservacionesArchivosController } from './observaciones-archivos.controller';

@Module({
  controllers: [ObservacionesArchivosController],
  providers: [ObservacionesArchivosService],
})
export class ObservacionesArchivosModule {}
