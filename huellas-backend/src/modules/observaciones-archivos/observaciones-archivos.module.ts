import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservacionesArchivosService } from './observaciones-archivos.service';
import { ObservacionesArchivosController } from './observaciones-archivos.controller';
import { ObservacionArchivo } from './entities/observaciones-archivo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ObservacionArchivo])],
  controllers: [ObservacionesArchivosController],
  providers: [ObservacionesArchivosService],
})
export class ObservacionesArchivosModule {}
