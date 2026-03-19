import { Module } from '@nestjs/common';
import { RequisitosRevistaService } from './requisitos-revista.service';
import { RequisitosRevistaController } from './requisitos-revista.controller';
import { RequisitoRevista } from './entities/requisitos-revista.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([RequisitoRevista])],
  controllers: [RequisitosRevistaController],
  providers: [RequisitosRevistaService],
  exports: [RequisitosRevistaService],
})
export class RequisitosRevistaModule {}
