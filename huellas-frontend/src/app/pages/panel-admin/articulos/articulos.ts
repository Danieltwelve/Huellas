import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  ArticuloResumenBackend,
  ArticulosService,
  ComiteEstadisticas,
  ComiteEvaluacionHistorial,
} from '../../../core/articulos/articulos.service';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type EstadoEvaluacionComite = 'pendiente' | 'evaluado-aceptado' | 'evaluado-rechazado';
type EstadoFiltroComite = 'todos' | EstadoEvaluacionComite;
type OrdenArticulos =
  | 'llegada-reciente'
  | 'llegada-antigua'
  | 'fecha-desc'
  | 'fecha-asc'
  | 'titulo-asc'
  | 'titulo-desc'
  | 'codigo-asc'
  | 'codigo-desc';

interface ArticuloListado {
  id: number;
  codigo: string;
  titulo: string;
  etapaActual: string;
  fechaAceptacion: string;
  tiempoProceso: string;
  fechaReferencia: Date | null;
  ordenLlegada: number;
  claseEtapa: string;
  estadoEvaluacion: EstadoEvaluacionComite;
  estadoEtiqueta: string;
  estadoClase: string;
  fechaAsignacion: string;
  fechaVencimiento: string;
  diasRestantes: number | null;
  estaVencido: boolean;
}

@Component({
  selector: 'app-articulos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './articulos.html',
  styleUrl: './articulos.css',
})
export class Articulos implements OnInit, OnDestroy {
  private articulosService = inject(ArticulosService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  searchTerm = '';
  committeeView = false;
  loading = true;
  pageTitle = 'Artículos';
  filtroEstadoComite: EstadoFiltroComite = 'todos';
  ordenArticulos: OrdenArticulos = 'llegada-reciente';
  estadisticasComite: ComiteEstadisticas | null = null;
  historialEvaluaciones: ComiteEvaluacionHistorial[] = [];
  mostrarHistorial = false;
  mostrarAccionesRapidas = true;

  articulos: ArticuloListado[] = [];
  filteredArticulos: ArticuloListado[] = [];

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.committeeView = this.route.snapshot.data['committeeView'] === true;

    this.route.queryParamMap.subscribe((params) => {
      const estadoQuery = params.get('estado') as EstadoFiltroComite | null;

      if (
        estadoQuery &&
        ['todos', 'pendiente', 'evaluado-aceptado', 'evaluado-rechazado'].includes(estadoQuery)
      ) {
        this.filtroEstadoComite = estadoQuery;
      } else {
        this.filtroEstadoComite = 'todos';
      }

      this.applySearch();
    });

    this.pageTitle = this.committeeView
      ? 'Panel Comité Editorial'
      : 'Artículos';

    const source$ = this.committeeView
      ? this.articulosService.getArticulosComiteAsignados()
      : this.articulosService.getResumenArticulos();

    source$.subscribe({
      next: (response) => {
        this.articulos = response.map((articulo, index) => this.mapArticulo(articulo, index));
        this.loading = false;
        this.applySearch();
      },
      error: (error) => {
        this.articulos = [];
        this.filteredArticulos = [];
        this.loading = false;
        console.error('Error al cargar el resumen de articulos:', error);
      },
    });

    if (this.committeeView) {
      this.cargarBloquesComite();
    }
  }

  private cargarBloquesComite(): void {
    this.articulosService.getEstadisticasComite().subscribe({
      next: (stats) => {
        this.estadisticasComite = stats;
      },
      error: () => {
        this.estadisticasComite = null;
      },
    });

    this.articulosService.getHistorialEvaluacionesComite().subscribe({
      next: (historial) => {
        this.historialEvaluaciones = historial;
      },
      error: () => {
        this.historialEvaluaciones = [];
      },
    });

  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.applySearch();
  }

  setOrdenArticulos(orden: string): void {
    if (!this.esOrdenArticulosValido(orden)) {
      return;
    }

    this.ordenArticulos = orden;
    this.applySearch();
  }

  toggleAccionesRapidas(): void {
    this.mostrarAccionesRapidas = !this.mostrarAccionesRapidas;
  }

  private applySearch(): void {
    const normalizedTerm = this.searchTerm.trim().toLowerCase();

    let base = [...this.articulos];

    if (this.committeeView && this.filtroEstadoComite !== 'todos') {
      base = base.filter((articulo) => articulo.estadoEvaluacion === this.filtroEstadoComite);
    }

    const filtrados = !normalizedTerm
      ? base
      : base.filter((articulo) => {
          const searchableText = [
            articulo.codigo,
            articulo.titulo,
            articulo.etapaActual,
            articulo.estadoEtiqueta,
            articulo.fechaAceptacion,
            articulo.tiempoProceso,
          ]
            .join(' ')
            .toLowerCase();

          return searchableText.includes(normalizedTerm);
        });

    this.filteredArticulos = this.ordenarArticulos(filtrados);
  }

  private mapArticulo(articulo: ArticuloResumenBackend, ordenLlegada: number): ArticuloListado {
    const etapaActual = articulo.etapa_nombre?.trim() || 'Desconocida';
    const fechaReferencia = this.committeeView
      ? articulo.fecha_asignacion ?? articulo.fecha_inicio
      : articulo.fecha_inicio;
    const fecha = this.parseFecha(fechaReferencia);
    const estadoComite = this.mapEstadoComite(articulo.estado_evaluacion);

    return {
      id: articulo.id,
      codigo: articulo.codigo,
      titulo: articulo.titulo,
      etapaActual,
      fechaAceptacion: this.formatFecha(fecha),
      tiempoProceso: this.calcularTiempoProceso(fecha),
      fechaReferencia: fecha,
      ordenLlegada: fecha ? fecha.getTime() : ordenLlegada,
      claseEtapa: this.getClaseEtapa(etapaActual),
      estadoEvaluacion: estadoComite,
      estadoEtiqueta: this.getEstadoEtiqueta(estadoComite),
      estadoClase: this.getEstadoClase(estadoComite),
      fechaAsignacion: this.formatFecha(this.parseFecha(articulo.fecha_asignacion ?? null)),
      fechaVencimiento: this.formatFecha(this.parseFecha(articulo.fecha_vencimiento ?? null)),
      diasRestantes: articulo.dias_restantes ?? null,
      estaVencido: articulo.esta_vencido ?? false,
    };
  }

  getEstadoPlazoLabel(articulo: ArticuloListado): string {
    if (articulo.estaVencido) {
      return 'Vencido';
    }

    if (articulo.diasRestantes === null) {
      return 'Sin plazo';
    }

    if (articulo.diasRestantes <= 5) {
      return 'Por vencer';
    }

    return `${articulo.diasRestantes} días restantes`;
  }

  getEstadoPlazoClase(articulo: ArticuloListado): string {
    if (articulo.estaVencido) {
      return 'deadline--vencido';
    }

    if (articulo.diasRestantes !== null && articulo.diasRestantes <= 5) {
      return 'deadline--proximo';
    }

    return 'deadline--ok';
  }

  exportarExcel(): void {
    this.articulosService.descargarReporteComiteExcel().subscribe({
      next: (blob) => {
        this.descargarBlob(
          blob,
          `reporte-comite-${new Date().toISOString().slice(0, 10)}.xlsx`,
        );
      },
    });
  }

  exportarPdf(): void {
    this.articulosService.descargarReporteComitePdf().subscribe({
      next: (blob) => {
        this.descargarBlob(
          blob,
          `reporte-comite-${new Date().toISOString().slice(0, 10)}.pdf`,
        );
      },
    });
  }

  irNotificaciones(): void {
    if (!this.committeeView) {
      return;
    }

    this.router.navigate(['/panel-comite-editorial/notificaciones']);
  }

  private descargarBlob(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  setFiltroEstadoComite(filtro: EstadoFiltroComite): void {
    if (!this.committeeView || this.filtroEstadoComite === filtro) {
      return;
    }

    this.filtroEstadoComite = filtro;
    this.applySearch();
  }

  private mapEstadoComite(
    estado?: 'pendiente' | 'evaluado-aceptado' | 'evaluado-rechazado',
  ): EstadoEvaluacionComite {
    if (estado === 'evaluado-aceptado') {
      return 'evaluado-aceptado';
    }

    if (estado === 'evaluado-rechazado') {
      return 'evaluado-rechazado';
    }

    return 'pendiente';
  }

  private getEstadoEtiqueta(estado: EstadoEvaluacionComite): string {
    if (estado === 'evaluado-aceptado') {
      return 'Evaluado - Aceptado';
    }

    if (estado === 'evaluado-rechazado') {
      return 'Evaluado - Rechazado';
    }

    return 'Pendiente';
  }

  private getEstadoClase(estado: EstadoEvaluacionComite): string {
    if (estado === 'evaluado-aceptado') {
      return 'status--aceptado';
    }

    if (estado === 'evaluado-rechazado') {
      return 'status--rechazado';
    }

    return 'status--pendiente';
  }

  private parseFecha(fechaIso: string | null): Date | null {
    if (!fechaIso) {
      return null;
    }

    const fecha = new Date(fechaIso);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  private formatFecha(fecha: Date | null): string {
    if (!fecha) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(fecha);
  }

  private calcularTiempoProceso(fecha: Date | null): string {
    if (!fecha) {
      return '-';
    }

    const diferenciaMs = Date.now() - fecha.getTime();
    const dias = Math.max(0, Math.floor(diferenciaMs / (1000 * 60 * 60 * 24)));
    return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  }

  private getClaseEtapa(etapa: string): string {
    const etapaNormalizada = this.normalizarTexto(etapa);

    if (etapaNormalizada.includes('revision preliminar')) {
      return 'stage--revision-preliminar';
    }

    if (etapaNormalizada.includes('turnitin')) {
      return 'stage--turnitin';
    }

    if (etapaNormalizada.includes('revision por pares')) {
      return 'stage--revision-pares';
    }

    if (etapaNormalizada.includes('certificacion')) {
      return 'stage--certificacion';
    }

    if (etapaNormalizada.includes('revision final')) {
      return 'stage--revision-final';
    }

    if (etapaNormalizada.includes('comite editorial')) {
      return 'stage--comite-editorial';
    }

    if (etapaNormalizada.includes('publicacion')) {
      return 'stage--publicacion';
    }

    return '';
  }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private ordenarArticulos(articulos: ArticuloListado[]): ArticuloListado[] {
    const base = [...articulos];

    base.sort((a, b) => {
      switch (this.ordenArticulos) {
        case 'llegada-antigua':
          return a.ordenLlegada - b.ordenLlegada;
        case 'fecha-desc':
          return this.compararFechas(b.fechaReferencia, a.fechaReferencia);
        case 'fecha-asc':
          return this.compararFechas(a.fechaReferencia, b.fechaReferencia);
        case 'titulo-asc':
          return a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' });
        case 'titulo-desc':
          return b.titulo.localeCompare(a.titulo, 'es', { sensitivity: 'base' });
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

  private compararFechas(fechaA: Date | null, fechaB: Date | null): number {
    if (!fechaA && !fechaB) {
      return 0;
    }

    if (!fechaA) {
      return 1;
    }

    if (!fechaB) {
      return -1;
    }

    return fechaA.getTime() - fechaB.getTime();
  }

  private esOrdenArticulosValido(orden: string): orden is OrdenArticulos {
    return [
      'llegada-reciente',
      'llegada-antigua',
      'fecha-desc',
      'fecha-asc',
      'titulo-asc',
      'titulo-desc',
      'codigo-asc',
      'codigo-desc',
    ].includes(orden);
  }

  get totalPendientes(): number {
    return this.articulos.filter((articulo) => articulo.estadoEvaluacion === 'pendiente').length;
  }

  get totalAceptados(): number {
    return this.articulos.filter((articulo) => articulo.estadoEvaluacion === 'evaluado-aceptado').length;
  }

  get totalRechazados(): number {
    return this.articulos.filter((articulo) => articulo.estadoEvaluacion === 'evaluado-rechazado').length;
  }

  verArticulo(id: number): void {
    if (this.committeeView) {
      this.router.navigate(['/panel-comite-editorial/articulos', id]);
      return;
    }

    this.router.navigate(['/flujo-trabajo-articulo', id]);
  }
}
