import { Component, OnInit, inject } from '@angular/core';
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
  solicitudProrrogaRevisorPendiente?: boolean;
  prorrogaRevisorAceptada?: boolean;
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

  // Start empty — filled from API in ngOnInit (mock is only the error fallback)
  articulos: ArticuloRevisorListado[] = [];
  cargando = true;
  prorrogasSolicitadas: EstadoProrroga = {};
  mensaje = '';
  ordenArticulos: OrdenArticulos = 'llegada-reciente';
  mostrarModalConfirmacion = false;
  articuloSeleccionadoId: number | null = null;

  ngOnInit(): void {
    this.cargando = true;
    this.revisoresService.getArticulosAsignadosRevisor().subscribe({
      next: (data) => {
        this.articulos = data
          .filter((articulo) => {
            if (articulo.estado === 'evaluado') return false;
            const limite = new Date(articulo.fechaLimite ?? '');
            if (isNaN(limite.getTime())) return false;
            return limite.getTime() < Date.now();
          })
          .map((articulo, index) => ({
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
            solicitudProrrogaRevisorPendiente: articulo.solicitudProrrogaRevisorPendiente,
            prorrogaRevisorAceptada: articulo.prorrogaRevisorAceptada,
            ordenLlegada: ((): number => {
              const ts = new Date(articulo.fechaAsignacion ?? '').getTime();
              return Number.isNaN(ts) ? index : ts;
            })(),
          }));
        this.cargando = false;
      },
      error: () => {
        // Only use mock data as a last-resort fallback when the API is unavailable
        this.articulos = ARTICULOS_ASIGNADOS_MOCK
          .filter((a) => {
            if (a.estado === 'evaluado') return false;
            const limite = new Date(a.fechaLimite);
            if (isNaN(limite.getTime())) return false;
            return limite.getTime() < Date.now();
          })
          .map((articulo, index) => ({
            ...articulo,
            ordenLlegada: ((): number => {
              const ts = new Date(articulo.fechaAsignacion).getTime();
              return Number.isNaN(ts) ? index : ts;
            })(),
          }));
        this.cargando = false;
      },
    });
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

  /** Returns the number of days overdue as a positive number (for display). */
  diasVencidos(fechaLimite: string): number {
    return Math.abs(this.diasRestantes(fechaLimite));
  }

  obtenerArticulo(articuloId: number): ArticuloRevisorListado | undefined {
    return this.articulos.find((a) => a.id === articuloId);
  }

  tieneProrroga(articuloId: number): boolean {
    const art = this.obtenerArticulo(articuloId);
    return !!art?.prorrogaRevisorAceptada;
  }

  prorrogasSolicitadasPendientes(articuloId: number): boolean {
    const art = this.obtenerArticulo(articuloId);
    return !!art?.solicitudProrrogaRevisorPendiente;
  }

  /**
   * Determines if the review for the given article should be blocked.
   * Blocking occurs when the deadline has passed (negative days remaining).
   * The block is applied regardless of any extension request or usage.
   */
  isRevisionBloqueada(articuloId: number): boolean {
    const art = this.obtenerArticulo(articuloId);
    if (!art) return false;
    const dias = this.diasRestantes(art.fechaLimite);
    // Block if deadline passed, ignoring any extension flags.
    return dias < 0;
  }

  solicitarProrroga(articuloId: number): void {
    const art = this.obtenerArticulo(articuloId);
    if (!art) return;

    if (art.prorrogaRevisorAceptada) {
      this.mensaje = 'Este artículo ya usó su única prórroga de 15 días.';
      return;
    }
    if (art.solicitudProrrogaRevisorPendiente) {
      this.mensaje = 'Ya existe una solicitud de prórroga pendiente de revisión.';
      return;
    }

    this.revisoresService.solicitarProrrogaRevisor(articuloId).subscribe({
      next: (res) => {
        art.solicitudProrrogaRevisorPendiente = true;
        this.mensaje = 'Prórroga de 15 días solicitada correctamente.';
      },
      error: (err) => {
        this.mensaje = err.error?.message || 'Error al solicitar la prórroga.';
      }
    });
  }

  formatearFecha(fechaStr: string): string {
    if (!fechaStr) return '';
    if (fechaStr.includes('T')) {
      return fechaStr.split('T')[0];
    }
    return fechaStr;
  }

  solicitarProrrogaConConfirmacion(articuloId: number): void {
    this.articuloSeleccionadoId = articuloId;
    this.mostrarModalConfirmacion = true;
  }

  cancelarConfirmacion(): void {
    this.mostrarModalConfirmacion = false;
    this.articuloSeleccionadoId = null;
  }

  confirmarSolicitarProrroga(): void {
    if (this.articuloSeleccionadoId !== null) {
      const id = this.articuloSeleccionadoId;
      this.cancelarConfirmacion();
      this.solicitarProrroga(id);
    }
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
