import { Injectable, NotFoundException } from '@nestjs/common';
import { Observacion } from './entities/observacione.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Articulo } from '../articulos/entities/articulo.entity';

@Injectable()
export class ObservacionesService {
  // observaciones.service.ts
  private static readonly ASUNTO_CORRECCION_AUTOR =
    'Corrección enviada por autor';

  constructor(
    @InjectRepository(Observacion)
    private observacionRepository: Repository<Observacion>,
    @InjectRepository(Articulo)
    private articuloRepository: Repository<Articulo>,
  ) {}

  async getUltimaVersionAutor(articuloId: number) {
    // 1. Obtener artículo con sus autores
    const articulo = await this.articuloRepository.findOne({
      where: { id: articuloId },
      relations: ['autores'],
    });
    if (!articulo) throw new NotFoundException('Artículo no encontrado');

    const autoresIds = articulo.autores.map((autor) => autor.id);
    if (autoresIds.length === 0)
      throw new NotFoundException('El artículo no tiene autores');

    // 2. Buscar observaciones con archivos y cuyo usuario sea autor
    const observaciones = await this.observacionRepository
      .createQueryBuilder('obs')
      .innerJoinAndSelect('obs.archivos', 'archivo')
      .where('obs.articuloId = :articuloId', { articuloId })
      .andWhere('obs.usuarioId IN (:...autoresIds)', { autoresIds })
      .orderBy('obs.fechaSubida', 'DESC')
      .getMany();

    if (observaciones.length === 0) {
      throw new NotFoundException('No se encontró ninguna versión del autor');
    }

    // 3. Priorizar observación con asunto de corrección
    const correccion = observaciones.find(
      (obs) => obs.asunto === ObservacionesService.ASUNTO_CORRECCION_AUTOR,
    );
    const versionFinal = correccion || observaciones[0];

    const archivo = versionFinal.archivos?.[0];
    if (!archivo)
      throw new NotFoundException(
        'La versión encontrada no tiene archivo adjunto',
      );

    return {
      observacionId: versionFinal.id,
      asunto: versionFinal.asunto,
      comentarios: versionFinal.comentarios,
      fechaSubida: versionFinal.fechaSubida,
      archivo: {
        nombreOriginal: archivo.archivoNombreOriginal,
        path: archivo.archivoPath,
      },
    };
  }
}
