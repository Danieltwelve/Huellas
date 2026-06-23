import { Component, OnInit, inject } from '@angular/core';
import { ARTICULOS_ASIGNADOS_MOCK } from '../panel-revisor.data';
import { ArticuloRevisorDto, RevisoresService } from '../../../core/revisores/revisores.service';

@Component({
  selector: 'app-resumen-revisor',
  standalone: true,
  templateUrl: './resumen-revisor.component.html',
  styleUrls: ['./resumen-revisor.component.css'],
})
export class ResumenRevisorComponent implements OnInit {
  private readonly revisoresService = inject(RevisoresService);

  articulos: ArticuloRevisorDto[] = ARTICULOS_ASIGNADOS_MOCK;

  ngOnInit(): void {
    this.revisoresService.getArticulosAsignadosRevisor().subscribe({
      next: (articulos) => {
        this.articulos = articulos;
      },
      error: () => {
        this.articulos = ARTICULOS_ASIGNADOS_MOCK;
      },
    });
  }

  get totalAsignados(): number {
    return this.articulos.length;
  }

  get pendientes(): number {
    return this.articulos.filter((a) => a.estado === 'pendiente').length;
  }

  get enProceso(): number {
    return this.articulos.filter((a) => a.estado === 'en-proceso').length;
  }

  get evaluados(): number {
    return this.articulos.filter((a) => a.estado === 'evaluado').length;
  }

  get proximoVencimiento(): string {
    const proximos = this.articulos
      .filter((item) => item.estado !== 'evaluado')
      .map((item) => (item.fechaLimite ? new Date(item.fechaLimite) : null))
      .filter((date): date is Date => Boolean(date))
      .filter((date) => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (proximos.length === 0) {
      return 'No hay artículos a evaluar';
    }

    return this.formatFecha(proximos[0]);
  }

  formatFecha(fecha: Date | string | null): string {
    if (!fecha) {
      return 'Sin fecha';
    }

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
