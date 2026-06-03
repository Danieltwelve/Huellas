import { Component, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HISTORIAL_REVISIONES_MOCK } from '../panel-revisor.data';
import { HistorialRevisionRevisorDto, RevisoresService } from '../../../core/revisores/revisores.service';

@Component({
  selector: 'app-historial-revisiones',
  standalone: true,
  templateUrl: './historial-revisiones.component.html',
  styleUrls: ['./historial-revisiones.component.css'],
})
export class HistorialRevisionesComponent implements OnInit {
  private readonly revisoresService = inject(RevisoresService);

  historial: HistorialRevisionRevisorDto[] = HISTORIAL_REVISIONES_MOCK.map((item, index) => ({
    id: index + 1,
    articuloId: index + 1,
    codigoArticulo: item.codigoArticulo,
    tituloArticulo: item.tituloArticulo,
    decision: item.decision,
    fechaEnvio: item.fechaEnvio,
    observacion: item.observacion,
    tieneAdjunto: false,
    enlace: '/panel-revisor/realizar-revision',
  }));

  async ngOnInit(): Promise<void> {
    try {
      this.historial = await firstValueFrom(this.revisoresService.getHistorialRevisionRevisor());
    } catch {
      this.historial = HISTORIAL_REVISIONES_MOCK.map((item, index) => ({
        id: index + 1,
        articuloId: index + 1,
        codigoArticulo: item.codigoArticulo,
        tituloArticulo: item.tituloArticulo,
        decision: item.decision,
        fechaEnvio: item.fechaEnvio,
        observacion: item.observacion,
        tieneAdjunto: false,
        enlace: '/panel-revisor/realizar-revision',
      }));
    }
  }

  decisionLabel(decision: string): string {
    if (decision === 'aceptar') return 'Aceptar';
    return 'Rechazar';
  }

  formatoFecha(fecha: string): string {
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(valor);
  }
}
