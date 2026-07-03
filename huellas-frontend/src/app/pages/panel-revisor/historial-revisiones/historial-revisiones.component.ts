import { Component, OnInit, inject } from '@angular/core';
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

  ngOnInit(): void {
    this.revisoresService.getHistorialRevisionRevisor().subscribe({
      next: (data) => {
        this.historial = data;
      },
      error: () => {
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
      },
    });
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

    let cleanText = texto;

    // Eliminar "Calificación: X/5" (con o sin punto final y espacios)
    cleanText = cleanText.replace(/Calificación:\s*\d+\/5[\s.,\r\n]*/gi, '');

    // Reemplazar "Decisión: X" por "Estado: X" con la recomendación normalizada
    cleanText = cleanText.replace(/Decisión:\s*(\w+)/gi, (match, p1) => {
      const decisionNormalizada = p1.toLowerCase() === 'aceptar' ? 'Aceptar' :
                                  p1.toLowerCase() === 'ajustes' ? 'Ajustes' : 'Rechazar';
      return `Estado: ${decisionNormalizada}`;
    });

    // Reemplazos de encabezados principales
    let html = cleanText
      .replace(/Estado:/g, '<strong>Estado:</strong>')
      .replace(/Recomendación:/g, '<strong>Recomendación:</strong>')
      .replace(/Comentarios:/g, '<strong>Comentarios:</strong>')
      .replace(/Jurado evaluador:/g, '<strong>Jurado evaluador:</strong>')
      .replace(/Articulo:/g, '<strong>Artículo:</strong>')
      .replace(/Recomendación seleccionada:/g, '<strong>Recomendación seleccionada:</strong>')
      .replace(/Se aprueba para publicación:/g, '<strong>Se aprueba para publicación:</strong>');

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
