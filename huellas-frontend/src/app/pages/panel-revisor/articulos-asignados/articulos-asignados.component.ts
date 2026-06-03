import { Component, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ARTICULOS_ASIGNADOS_MOCK } from '../panel-revisor.data';
import { ArticuloRevisorDto, RevisoresService } from '../../../core/revisores/revisores.service';
import { Router } from '@angular/router';

type OrdenTabla = 'llegada_desc' | 'llegada_asc' | 'vence_asc' | 'vence_desc';

@Component({
  selector: 'app-articulos-asignados',
  standalone: true,
  templateUrl: './articulos-asignados.component.html',
  styleUrls: ['./articulos-asignados.component.css'],
})
export class ArticulosAsignadosComponent implements OnInit {
  private readonly revisoresService = inject(RevisoresService);
  private readonly router = inject(Router);

  articulos: ArticuloRevisorDto[] = [];
  private articulosFuente: ArticuloRevisorDto[] = ARTICULOS_ASIGNADOS_MOCK;

  readonly opcionesOrden: Array<{ valor: OrdenTabla; etiqueta: string }> = [
    { valor: 'llegada_desc', etiqueta: 'Orden de llegada: más reciente' },
    { valor: 'llegada_asc', etiqueta: 'Orden de llegada: más antiguo' },
    { valor: 'vence_asc', etiqueta: 'Vence primero' },
    { valor: 'vence_desc', etiqueta: 'Vence después' },
  ];

  ordenActual: OrdenTabla = 'llegada_desc';

  async ngOnInit(): Promise<void> {
    try {
      this.articulosFuente = await firstValueFrom(this.revisoresService.getArticulosAsignadosRevisor());
    } catch {
      this.articulosFuente = ARTICULOS_ASIGNADOS_MOCK;
    }

    this.aplicarOrden();
  }

  onOrdenChange(valor: string): void {
    if (!this.esOrdenTabla(valor)) {
      return;
    }

    this.ordenActual = valor;
    this.aplicarOrden();
  }

  getEtiquetaEstado(estado: string): string {
    if (estado === 'en-proceso') {
      return 'En revisión';
    }
    if (estado === 'evaluado') {
      return 'Evaluado';
    }
    return 'Pendiente';
  }

  getEtiquetaPrioridad(prioridad: 'alta' | 'media' | 'baja'): string {
    if (prioridad === 'alta') {
      return 'Alta';
    }

    if (prioridad === 'media') {
      return 'Media';
    }

    return 'Baja';
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) {
      return '—';
    }

    const fechaParseada = new Date(fecha);
    if (Number.isNaN(fechaParseada.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(fechaParseada);
  }

  esVencido(fecha: string | null): boolean {
    const fechaLimite = this.obtenerFechaValida(fecha);
    if (!fechaLimite) {
      return false;
    }

    const finDelDia = new Date(fechaLimite);
    finDelDia.setHours(23, 59, 59, 999);

    return finDelDia.getTime() < Date.now();
  }

  estaPorVencer(fecha: string | null): boolean {
    const fechaLimite = this.obtenerFechaValida(fecha);
    if (!fechaLimite) {
      return false;
    }

    const finDelDia = new Date(fechaLimite);
    finDelDia.setHours(23, 59, 59, 999);

    const diferenciaMs = finDelDia.getTime() - Date.now();
    if (diferenciaMs < 0) {
      return false;
    }

    const tresDiasMs = 3 * 24 * 60 * 60 * 1000;
    return diferenciaMs <= tresDiasMs;
  }

  irARevision(articuloId: number): void {
    this.router.navigate(['/panel-revisor/realizar-revision'], {
      queryParams: { articuloId },
    });
  }

  private aplicarOrden(): void {
    const articulosOrdenados = [...this.articulosFuente];

    articulosOrdenados.sort((articuloA, articuloB) => {
      switch (this.ordenActual) {
        case 'llegada_asc':
          return this.obtenerTimestamp(articuloA.fechaAsignacion, Number.MAX_SAFE_INTEGER)
            - this.obtenerTimestamp(articuloB.fechaAsignacion, Number.MAX_SAFE_INTEGER);
        case 'vence_asc':
          return this.obtenerTimestamp(articuloA.fechaLimite, Number.MAX_SAFE_INTEGER)
            - this.obtenerTimestamp(articuloB.fechaLimite, Number.MAX_SAFE_INTEGER);
        case 'vence_desc':
          return this.obtenerTimestamp(articuloB.fechaLimite, 0)
            - this.obtenerTimestamp(articuloA.fechaLimite, 0);
        case 'llegada_desc':
        default:
          return this.obtenerTimestamp(articuloB.fechaAsignacion, 0)
            - this.obtenerTimestamp(articuloA.fechaAsignacion, 0);
      }
    });

    this.articulos = articulosOrdenados;
  }

  private esOrdenTabla(valor: string): valor is OrdenTabla {
    return this.opcionesOrden.some((opcion) => opcion.valor === valor);
  }

  private obtenerTimestamp(fecha: string | null, fallback: number): number {
    const fechaValida = this.obtenerFechaValida(fecha);
    return fechaValida ? fechaValida.getTime() : fallback;
  }

  private obtenerFechaValida(fecha: string | null): Date | null {
    if (!fecha) {
      return null;
    }

    const fechaParseada = new Date(fecha);
    if (Number.isNaN(fechaParseada.getTime())) {
      return null;
    }

    return fechaParseada;
  }
}
