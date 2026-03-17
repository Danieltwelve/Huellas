import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EdicionRevista } from './edicion-revista.entity';
import { EstadoEdicionRevista } from './estados/estado-edicion-revista.entity';
import { EdicionesController } from './ediciones.controller';
import { EdicionesService } from './ediciones.service';
import { EstadosModule } from './estados/estados.module';
import { FirebaseAdminModule } from 'src/common/firebase/firebase-admin.module';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EdicionRevista, EstadoEdicionRevista]),
    EstadosModule,
    FirebaseAdminModule,
    UsersModule,
  ],
  controllers: [EdicionesController],
  providers: [EdicionesService, JwtAuthGuard, RolesGuard],
  exports: [TypeOrmModule],
})
export class EdicionesModule {}
