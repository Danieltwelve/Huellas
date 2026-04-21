import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EtapaArticulo } from 'src/modules/etapas-articulo/entities/etapa_articulo.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EtapaArticuloSeeder implements OnModuleInit {
  constructor(
    @InjectRepository(EtapaArticulo)
    private readonly etapaRepository: Repository<EtapaArticulo>,
  ) {}

  async onModuleInit() {
    const etapasIniciales = [
      {
        id: 1,
        nombre: 'REVISIÓN PRELIMINAR',
        descripcion:
          'El equipo editorial está verificando los requisitos formales y la pertinencia temática de tu artículo.',
      },
      {
        id: 2,
        nombre: 'RECEPCIÓN',
        descripcion: 'El artículo ha sido registrado en la base de datos.',
      },
      {
        id: 3,
        nombre: 'TURNITING',
        descripcion:
          'Se está realizando la verificación de originalidad mediante la herramienta Turnitin.',
      },
      {
        id: 4,
        nombre: 'REVISIÓN POR PARES',
        descripcion:
          'El artículo está siendo evaluado por expertos en la materia (revisión ciega).',
      },
      {
        id: 8,
        nombre: 'CERTIFICACIÓN',
        descripcion:
          'Se valida el cumplimiento documental, de formato y de lineamientos editoriales antes del cierre.',
      },
      {
        id: 9,
        nombre: 'REVISIÓN FINAL',
        descripcion:
          'Última revisión integral del artículo antes de su publicación oficial.',
      },
      {
        id: 5,
        nombre: 'PUBLICACIÓN',
        descripcion:
          'El artículo ha sido aceptado y se encuentra en fase de Publicación.',
      },
      {
        id: 6,
        nombre: 'COMITÉ EDITORIAL',
        descripcion:
          'El comité editorial evalúa el artículo mediante rúbrica y emite aceptación o rechazo.',
      },
      {
        id: 7,
        nombre: 'DESCARTADO',
        descripcion: 'Artículo rechazado de forma definitiva en el flujo editorial',
      },
    ];

    for (const etapaData of etapasIniciales) {
      const existe = await this.etapaRepository.findOneBy({ id: etapaData.id });
      if (!existe) {
        const nuevaEtapa = this.etapaRepository.create(etapaData);
        await this.etapaRepository.save(nuevaEtapa);
      } else {
        if (
          existe.nombre !== etapaData.nombre ||
          existe.descripcion !== etapaData.descripcion
        ) {
          await this.etapaRepository.update(etapaData.id, {
            nombre: etapaData.nombre,
            descripcion: etapaData.descripcion,
          });
        }
      }
    }
  }
}
