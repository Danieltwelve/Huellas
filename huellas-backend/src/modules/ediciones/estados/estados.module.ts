import { Module } from '@nestjs/common';
import { EstadoEdicionRevista } from './estado-edicion-revista.entity';
import { EstadoEdicionRevistaSeeder } from 'src/databases/seeders/estado-edicion-revista.seeder';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([EstadoEdicionRevista])],
  providers: [EstadoEdicionRevistaSeeder],
  exports: [TypeOrmModule],
})
export class EstadosModule {}
