import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tema } from './entities/tema.entity';
import { TemasController } from './temas.controller';
import { TemasService } from './temas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tema])],
  controllers: [TemasController],
  providers: [TemasService],
  exports: [TemasService],
})
export class TemasModule {}
