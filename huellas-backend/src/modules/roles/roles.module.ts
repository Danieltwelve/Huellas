import { Module } from '@nestjs/common';
import { Role } from './roles.entity';
import { RolesSeederService } from './roles.seeder.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  providers: [RolesSeederService],
  exports: [RolesSeederService],
})
export class RolesModule {}
