import { Component, OnInit, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ARTICULOS_ASIGNADOS_MOCK } from '../panel-revisor.data';
import { ArticuloRevisorDto, RevisoresService } from '../../../core/revisores/revisores.service';

type OrdenArticulos =
  | 'llegada-reciente'
  | 'llegada-antigua'
  | 'fecha-limite-asc'
  | 'fecha-limite-desc'
  | 'codigo-asc'
  | 'codigo-desc';

interface ArticuloRevisorListado {
  id: number;
  codigo: string;
  titulo: string;
  resumen: string;
  tema: string;
  fechaAsignacion: string;
  fechaLimite: string;
  estado: 'pendiente' | 'en-proceso' | 'evaluado';
  prioridad: 'alta' | 'media' | 'baja';
  ronda: number;
  ordenLlegada: number;
}

interface EstadoProrroga {
  [articleId: number]: boolean;
}

@Component({
  selector: 'app-plazo-revision',
  standalone: true,
  templateUrl: './plazo-revision.component.html',
  styleUrls: ['./plazo-revision.component.css'],
})
export class PlazoRevisionComponent implements OnInit {
  private readonly revisoresService = inject(RevisoresService);

  articulos: ArticuloRevisorListado[] = ARTICULOS_ASIGNADOS_MOCK.map((articulo, index) => ({
    ...articulo,
    ordenLlegada: ((): number => {
      const ts = new Date(articulo.fechaAsignacion).getTime();
      return Number.isNaN(ts) ? index : ts;
    })(),
  }));
  prorrogasSolicitadas: EstadoProrroga = {};
  mensaje = '';
  ordenArticulos: OrdenArticulos = 'llegada-reciente';

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.revisoresService.getArticulosAsignadosRevisor());
      this.articulos = data.map((articulo, index) => ({
        id: articulo.id,
        codigo: articulo.codigo,
        titulo: articulo.titulo,
        resumen: articulo.resumen,
        tema: articulo.tema,
        fechaAsignacion: articulo.fechaAsignacion ?? new Date().toISOString(),
        fechaLimite: articulo.fechaLimite ?? new Date().toISOString(),
        estado: articulo.estado,
        prioridad: articulo.prioridad,
        ronda: articulo.ronda,
        ordenLlegada: ((): number => {
          const ts = new Date(articulo.fechaAsignacion ?? '').getTime();
          return Number.isNaN(ts) ? index : ts;
        })(),
      }));
    } catch {
      this.articulos = ARTICULOS_ASIGNADOS_MOCK.map((articulo, index) => ({
        ...articulo,
        ordenLlegada: ((): number => {
          const ts = new Date(articulo.fechaAsignacion).getTime();
          return Number.isNaN(ts) ? index : ts;
        })(),
      }));
    }
  }

  get articulosOrdenados(): ArticuloRevisorListado[] {
    const base = [...this.articulos];

    base.sort((a, b) => {
      switch (this.ordenArticulos) {
        case 'llegada-antigua':
          return a.ordenLlegada - b.ordenLlegada;
        case 'fecha-limite-asc':
          return this.compararFechas(a.fechaLimite, b.fechaLimite);
        case 'fecha-limite-desc':
          return this.compararFechas(b.fechaLimite, a.fechaLimite);
        case 'codigo-asc':
          return a.codigo.localeCompare(b.codigo, 'es', { numeric: true, sensitivity: 'base' });
        case 'codigo-desc':
          return b.codigo.localeCompare(a.codigo, 'es', { numeric: true, sensitivity: 'base' });
        case 'llegada-reciente':
        default:
          return b.ordenLlegada - a.ordenLlegada;
      }
    });

    return base;
  }

  setOrdenArticulos(orden: string): void {
    if (!this.esOrdenArticulosValido(orden)) {
      return;
    }

    this.ordenArticulos = orden;
  }

  diasRestantes(fechaLimite: string): number {
    const hoy = new Date();
    const limite = new Date(fechaLimite);
    if (isNaN(limite.getTime())) return 0;

    const diffMs = limite.getTime() - hoy.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  tieneProrroga(articuloId: number): boolean {
    return Boolean(this.prorrogasSolicitadas[articuloId]);
  }

  solicitarProrroga(articuloId: number): void {
    if (this.tieneProrroga(articuloId)) {
      this.mensaje = 'Este articulo ya uso su unica prorroga de 15 dias.';
      return;
    }

    this.prorrogasSolicitadas[articuloId] = true;
    this.mensaje = 'Prorroga de 15 dias solicitada correctamente.';
  }

  private compararFechas(fechaA: string, fechaB: string): number {
    const valorA = new Date(fechaA).getTime();
    const valorB = new Date(fechaB).getTime();

    if (Number.isNaN(valorA) && Number.isNaN(valorB)) {
      return 0;
    }

    if (Number.isNaN(valorA)) {
      return 1;
    }

    if (Number.isNaN(valorB)) {
      return -1;
    }

    return valorA - valorB;
  }

  private esOrdenArticulosValido(orden: string): orden is OrdenArticulos {
    return [
      'llegada-reciente',
      'llegada-antigua',
      'fecha-limite-asc',
      'fecha-limite-desc',
      'codigo-asc',
      'codigo-desc',
    ].includes(orden);
  }
}
