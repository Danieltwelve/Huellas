import { Module } from '@nestjs/common';
import { RevisoresService } from './revisores.service';
import { RevisoresController } from './revisores.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Revisores } from './entities/revisores.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Revisores])],
  controllers: [RevisoresController],
  providers: [RevisoresService],
})
export class RevisoresModule {}
