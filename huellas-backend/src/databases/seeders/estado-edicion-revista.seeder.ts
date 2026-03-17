import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EstadoEdicionRevista } from 'src/modules/ediciones/estados/estado-edicion-revista.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EstadoEdicionRevistaSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(EstadoEdicionRevista)
    private readonly estadoRepository: Repository<EstadoEdicionRevista>,
  ) {}

  async onModuleInit() {
    const estadosIniciales = [
      { id: 1, estado: 'ABIERTA' },
      { id: 2, estado: 'EN REVISION' },
      { id: 3, estado: 'PUBLICADA' },
    ];

    for (const estadoData of estadosIniciales) {
      const existe = await this.estadoRepository.findOneBy({
        id: estadoData.id,
      });
      if (!existe) {
        const nuevoEstado = this.estadoRepository.create(estadoData);
        await this.estadoRepository.save(nuevoEstado);
        console.log(
          `Estado "${estadoData.estado}" creado con ID ${estadoData.id}`,
        );
      } else {
        // Opcional: actualizar el nombre si cambió
        if (existe.estado !== estadoData.estado) {
          await this.estadoRepository.update(estadoData.id, {
            estado: estadoData.estado,
          });
          console.log(
            `Estado ID ${estadoData.id} actualizado a "${estadoData.estado}"`,
          );
        }
      }
    }
  }
}
