import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FerchContador } from 'src/modules/articulos/entities/ferch-contador.entity';
import { Repository } from 'typeorm';

@Injectable()
export class FerchContadorSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(FerchContadorSeeder.name);

  constructor(
    @InjectRepository(FerchContador)
    private readonly ferchContadorRepository: Repository<FerchContador>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedContador();
  }

  private async seedContador() {
    const contador = await this.ferchContadorRepository.findOne({
      where: { id: 1 },
    });

    if (!contador) {
      const nuevoContador = this.ferchContadorRepository.create({
        id: 1,
        ultimoNumero: 99,
      });
      await this.ferchContadorRepository.save(nuevoContador);
    }
  }
}
