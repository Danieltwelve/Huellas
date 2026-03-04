import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './roles.entity';

@Injectable()
export class RolesSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RolesSeederService.name);

  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedRoles();
  }

  private async seedRoles() {
    const rolesNecesarios = ['admin', 'editor', 'revisor', 'autor'];

    for (const nombreRol of rolesNecesarios) {
      const rolExiste = await this.rolesRepository.findOne({
        where: { rol: nombreRol },
      });

      if (!rolExiste) {
        const nuevoRol = this.rolesRepository.create({ rol: nombreRol });
        await this.rolesRepository.save(nuevoRol);
        this.logger.log(`🌱 Seeder: Rol '${nombreRol}' creado exitosamente.`);
      }
    }

    this.logger.log('✅ Verificación de roles completada.');
  }
}
