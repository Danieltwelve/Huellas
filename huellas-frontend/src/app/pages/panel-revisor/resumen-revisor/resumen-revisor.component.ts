import { Component } from '@angular/core';
import { ARTICULOS_ASIGNADOS_MOCK } from '../panel-revisor.data';

@Component({
  selector: 'app-resumen-revisor',
  standalone: true,
  templateUrl: './resumen-revisor.component.html',
  styleUrls: ['./resumen-revisor.component.css'],
})
export class ResumenRevisorComponent {
  articulos = ARTICULOS_ASIGNADOS_MOCK;

  get totalAsignados(): number {
    return this.articulos.length;
  }

  get pendientes(): number {
    return this.articulos.filter((a) => a.estado === 'pendiente').length;
  }

  get enProceso(): number {
    return this.articulos.filter((a) => a.estado === 'en-proceso').length;
  }

  get enviados(): number {
    return this.articulos.filter((a) => a.estado === 'enviado').length;
  }

  get proximoVencimiento(): string {
    const proximos = this.articulos
      .map((item) => new Date(item.fechaLimite))
      .filter((date) => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (proximos.length === 0) {
      return 'Sin vencimientos';
    }

    return this.formatFecha(proximos[0]);
  }

  formatFecha(fecha: Date | string): string {
    const valor = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(valor.getTime())) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(valor);
  }
}
