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
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { FirebaseAdminModule } from 'src/common/firebase/firebase-admin.module';
import { UsersModule } from '../users/users.module';
import { Role } from '../roles/roles.entity';
import { User } from '../users/user.entity';
import { FerchContador } from './entities/ferch-contador.entity';
import { FerchContadorSeeder } from 'src/databases/seeders/ferch-articulo.seeder';

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
      Role,
      User,
      FerchContador,
    ]),
    FirebaseAdminModule,
    UsersModule,
  ],
  controllers: [ArticulosController],
  providers: [
    ArticulosService,
    EtapaArticuloSeeder,
    TemaSeeder,
    JwtAuthGuard,
    RolesGuard,
    FerchContadorSeeder,
  ],
})
export class ArticulosModule {}
