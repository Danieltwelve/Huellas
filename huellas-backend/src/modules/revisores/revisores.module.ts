import { Module } from '@nestjs/common';
import { RevisoresService } from './revisores.service';
import { RevisoresController } from './revisores.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Revisores } from './entities/revisores.entity';
import { User } from '../users/user.entity';
import { Articulo } from 'src/modules/articulos/entities/articulo.entity';
import { GeminiService } from 'src/common/gemini/gemini.service';
import { FirebaseAdminModule } from 'src/common/firebase/firebase-admin.module';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Revisores, User, Articulo]),
    FirebaseAdminModule,
    UsersModule,
  ],
  controllers: [RevisoresController],
  providers: [RevisoresService, GeminiService, JwtAuthGuard, RolesGuard],
})
export class RevisoresModule {}
