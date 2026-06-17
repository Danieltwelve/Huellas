import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Articulo } from '../articulos/entities/articulo.entity';
import { Observacion } from '../observaciones/entities/observacione.entity';
import { ArticuloHistorialEtapa } from '../articulos-historial-etapas/entities/articulos-historial-etapa.entity';
import { UsersService } from './users.service';

@Injectable()
export class UsersRemindersJob {
  private readonly logger = new Logger(UsersRemindersJob.name);

  constructor(
    @InjectRepository(Articulo)
    private readonly articuloRepository: Repository<Articulo>,
    @InjectRepository(Observacion)
    private readonly observacionRepository: Repository<Observacion>,
    @InjectRepository(ArticuloHistorialEtapa)
    private readonly historialEtapaRepository: Repository<ArticuloHistorialEtapa>,
    private readonly usersService: UsersService,
  ) {}

  // Cron Job programado para ejecutarse a las 8:00 AM todos los días
  @Cron('0 0 8 * * *')
  async sendEvaluationReminders() {
    this.logger.log('Iniciando proceso diario de recordatorios de evaluación...');

    try {
      await this.remindCommitteeMembers();
      await this.remindPeerReviewers();
    } catch (error) {
      this.logger.error('Error durante el envío de recordatorios programados:', error);
    }

    this.logger.log('Proceso de recordatorios finalizado.');
  }

  // --- RECORDATORIOS PARA COMITÉ EDITORIAL ---
  private async remindCommitteeMembers() {
    const ahora = new Date();

    // 1. Obtener artículos en etapa 6 (Comité Editorial)
    const articulos = await this.articuloRepository.find({
      where: {
        etapaActualId: 6, // ETAPA_COMITE_EDITORIAL
      },
      relations: ['comiteEditorial', 'observaciones'],
    });

    for (const articulo of articulos) {
      if (!articulo.comiteEditorial || !articulo.fechaAsignacionComite) {
        continue;
      }

      // 2. Comprobar si el miembro ya registró su evaluación de comité
      const yaEvaluado = articulo.observaciones?.some(
        (obs) =>
          obs.usuarioId === articulo.comiteEditorialId &&
          this.isAsuntoEvaluacionComite(obs.asunto),
      );

      if (yaEvaluado) {
        continue;
      }

      // 3. Calcular días transcurridos
      const diasTranscurridos = Math.floor(
        (ahora.getTime() - new Date(articulo.fechaAsignacionComite).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      // 4. Si es múltiplo de 10 y mayor a 0, enviar recordatorio
      if (diasTranscurridos > 0 && diasTranscurridos % 10 === 0) {
        this.logger.log(
          `Comité Editorial: Enviando recordatorio para el artículo "${articulo.titulo}" a ${articulo.comiteEditorial.correo} (Días transcurridos: ${diasTranscurridos})`,
        );

        await this.usersService.sendEvaluationReminderEmail(
          articulo.comiteEditorial.correo,
          articulo.comiteEditorial.nombre,
          articulo.titulo,
          'Comité Editorial',
          diasTranscurridos,
        );
      }
    }
  }

  // --- RECORDATORIOS PARA REVISORES POR PARES ---
  private async remindPeerReviewers() {
    const ahora = new Date();

    // 1. Obtener artículos en etapa 4 (Revisión por Pares)
    const articulos = await this.articuloRepository.find({
      where: {
        etapaActualId: 4, // ETAPA_REVISION_PARES
      },
      relations: ['revisor', 'revisor.usuario', 'observaciones'],
    });

    for (const articulo of articulos) {
      if (!articulo.revisor || !articulo.revisor.usuario) {
        continue;
      }

      // 2. Comprobar si el revisor ya emitió su evaluación en la etapa
      const yaEvaluado = articulo.observaciones?.some(
        (obs) =>
          obs.usuarioId === articulo.revisor!.usuarioId &&
          this.esAsuntoRevisionPares(obs.asunto),
      );

      if (yaEvaluado) {
        continue;
      }

      // 3. Buscar cuándo comenzó la etapa de revisión por pares para este artículo
      const historialEtapa = await this.historialEtapaRepository.findOne({
        where: {
          articuloId: articulo.id,
          etapaId: 4, // ETAPA_REVISION_PARES
        },
        order: { fechaInicio: 'ASC' },
      });

      const fechaBase = historialEtapa ? new Date(historialEtapa.fechaInicio) : ahora;

      // 4. Calcular días transcurridos
      const diasTranscurridos = Math.floor(
        (ahora.getTime() - fechaBase.getTime()) / (1000 * 60 * 60 * 24),
      );

      // 5. Si es múltiplo de 10 y mayor a 0, enviar recordatorio
      if (diasTranscurridos > 0 && diasTranscurridos % 10 === 0) {
        this.logger.log(
          `Revisión por Pares: Enviando recordatorio para el artículo "${articulo.titulo}" a ${articulo.revisor.usuario.correo} (Días transcurridos: ${diasTranscurridos})`,
        );

        await this.usersService.sendEvaluationReminderEmail(
          articulo.revisor.usuario.correo,
          articulo.revisor.usuario.nombre,
          articulo.titulo,
          'Revisor por Pares',
          diasTranscurridos,
        );
      }
    }
  }

  // --- MÉTODOS DE COMPROBACIÓN ---
  private isAsuntoEvaluacionComite(asunto?: string): boolean {
    const texto = (asunto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return (
      texto.includes('evalu') &&
      texto.includes('comite') &&
      !texto.includes('prorroga') &&
      (texto.includes('acept') || texto.includes('rechaz'))
    );
  }

  private esAsuntoRevisionPares(asunto?: string | null): boolean {
    const texto = (asunto ?? '').toLowerCase().trim();
    return /^revisi[oó]n por pares:\s*(aceptar|ajustes|rechazar)/.test(texto);
  }
}
