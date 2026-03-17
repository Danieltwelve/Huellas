import { Module } from '@nestjs/common';
import { Role } from './roles.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesSeederService } from 'src/databases/seeders/roles.seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  providers: [RolesSeederService],
  exports: [TypeOrmModule],
})
export class RolesModule {}
