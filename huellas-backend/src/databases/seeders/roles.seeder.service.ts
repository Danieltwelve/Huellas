import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from 'src/modules/roles/roles.entity';
import { Repository } from 'typeorm';

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
    const rolesNecesarios = [
      'admin',
      'director',
      'monitor',
      'comite-editorial',
      'revisor',
      'autor',
    ];

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
