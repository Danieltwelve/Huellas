import { Component, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
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

  async ngOnInit(): Promise<void> {
    try {
      this.articulos = await firstValueFrom(this.revisoresService.getArticulosAsignadosRevisor());
    } catch {
      this.articulos = ARTICULOS_ASIGNADOS_MOCK;
    }
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

  get enviados(): number {
    return this.articulos.filter((a) => a.estado === 'enviado').length;
  }

  get proximoVencimiento(): string {
    const proximos = this.articulos
      .map((item) => (item.fechaLimite ? new Date(item.fechaLimite) : null))
      .filter((date): date is Date => Boolean(date))
      .filter((date) => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (proximos.length === 0) {
      return 'Sin vencimientos';
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
