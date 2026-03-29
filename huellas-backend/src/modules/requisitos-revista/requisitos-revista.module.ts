import { Module } from '@nestjs/common';
import { RequisitosRevistaService } from './requisitos-revista.service';
import { RequisitosRevistaController } from './requisitos-revista.controller';
import { RequisitoRevista } from './entities/requisitos-revista.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseAdminModule } from 'src/common/firebase/firebase-admin.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RequisitoRevista]),
    FirebaseAdminModule,
    UsersModule,
  ],
  controllers: [RequisitosRevistaController],
  providers: [RequisitosRevistaService],
  exports: [RequisitosRevistaService],
})
export class RequisitosRevistaModule {}
