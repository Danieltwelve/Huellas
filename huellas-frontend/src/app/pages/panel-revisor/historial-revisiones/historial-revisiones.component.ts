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
    if (decision === 'ajustes') return 'Ajustes';
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
    }).format(valor);
  }

  formatoObservacionHtml(texto: string): string {
    if (!texto) return '';

    // Reemplazos de encabezados principales
    let html = texto
      .replace(/Calificación:/g, '<strong>Calificación:</strong>')
      .replace(/Recomendación:/g, '<br/><strong>Recomendación:</strong>')
      .replace(/Comentarios:/g, '<br/><strong>Comentarios:</strong>')
      .replace(/Jurado evaluador:/g, '<br/><strong>Jurado evaluador:</strong>')
      .replace(/Articulo:/g, '<br/><strong>Artículo:</strong>')
      .replace(/Recomendación seleccionada:/g, '<br/><strong>Recomendación seleccionada:</strong>')
      .replace(/Se aprueba para publicación:/g, '<br/><strong>Se aprueba para publicación:</strong>');

    // Reemplazos de preguntas de rúbrica (del 1 al 15)
    for (let i = 1; i <= 15; i++) {
      const regex = new RegExp(`${i}\\.\\s+Sobre`, 'g');
      html = html.replace(regex, `<br/><br/><strong>${i}. Sobre`);
    }

    // Reemplazos de respuestas
    html = html.replace(/Respuesta:/g, '<br/><span class="respuesta-label">Respuesta:</span>');

    return html;
  }
}
