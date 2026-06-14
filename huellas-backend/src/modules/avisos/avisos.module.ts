import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvisosService } from './avisos.service';
import { AvisosController } from './avisos.controller';
import { Aviso } from './entities/aviso.entity';
import { FirebaseAdminModule } from 'src/common/firebase/firebase-admin.module';
import { UsersModule } from '../users/users.module';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Aviso]),
    FirebaseAdminModule,
    UsersModule,
  ],
  controllers: [AvisosController],
  providers: [AvisosService, JwtAuthGuard, RolesGuard],
})
export class AvisosModule {}
