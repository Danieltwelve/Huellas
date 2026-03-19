import { Module } from '@nestjs/common';
import { ArticulosService } from './articulos.service';
import { ArticulosController } from './articulos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Articulo } from './entities/articulo.entity';
import { EtapaArticulo } from '../etapas-articulo/entities/etapa_articulo.entity';
import { EdicionRevista } from '../ediciones/edicion-revista.entity';
import { EtapaArticuloSeeder } from 'src/databases/seeders/etapa-articulo.seeder';
import { Tema } from '../temas/entities/tema.entity';
import { ArticuloHistorialEtapa } from '../articulos-historial-etapas/entities/articulos-historial-etapa.entity';
import { Observacion } from '../observaciones/entities/observacione.entity';
import { ObservacionArchivo } from '../observaciones-archivos/entities/observaciones-archivo.entity';
import { TemaSeeder } from 'src/databases/seeders/tema.seeder';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Articulo,
      EtapaArticulo,
      EdicionRevista,
      Tema,
      ArticuloHistorialEtapa,
      Observacion,
      ObservacionArchivo,
    ]),
  ],
  controllers: [ArticulosController],
  providers: [ArticulosService, EtapaArticuloSeeder, TemaSeeder],
})
export class ArticulosModule {}
