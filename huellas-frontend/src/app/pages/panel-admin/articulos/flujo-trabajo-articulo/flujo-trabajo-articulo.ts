import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import {
  ArticuloFlujo,
  ArticulosService,
  ObservacionBackend,
} from '../../../../core/articulos/articulos.service';
import { ActivatedRoute } from '@angular/router';
import { CrearObservacion } from './crear-observacion/crear-observacion';

interface EtapaFlujo {
  id: number;
  titulo: string;
  activa: boolean;
}

interface ArchivoRegistro {
  nombre: string;
  path: string;
}

interface RegistroFlujo {
  id: number;
  etapaId: number | null;
  fechaOrden: number;
  fecha: string;
  autor: string;
  rol: string;
  asunto: string;
  comentario?: string;
  archivos?: ArchivoRegistro[];
  expandido?: boolean;
}

@Component({
  selector: 'app-flujo-trabajo-articulo',
  imports: [CommonModule, CrearObservacion],
  templateUrl: './flujo-trabajo-articulo.html',
  styleUrl: './flujo-trabajo-articulo.scss',
  standalone: true,
})
export class FlujoTrabajoArticulo {
  private readonly route = inject(ActivatedRoute);
  private readonly articulosService = inject(ArticulosService);

  showCreateModal = false;
  showConfirmMoveModal = false;
  resumenExpandido = false;
  moviendoEtapa = false;
  errorMoverEtapa: string | null = null;
  private cdr = inject(ChangeDetectorRef);

  articulo: ArticuloFlujo | null = null;
  etapaActualId: number | null = null;
  loading = true;
  error: string | null = null;

  tituloArticulo = 'Cargando...';

  readonly etapasDisponibles: EtapaFlujo[] = [
    { id: 1, titulo: 'Revisión Preliminar', activa: false },
    { id: 2, titulo: 'Recepción', activa: false },
    { id: 3, titulo: 'Turniting', activa: false },
    { id: 4, titulo: 'Revisión por pares', activa: false },
    { id: 5, titulo: 'Publicación', activa: false },
  ];

  etapas: EtapaFlujo[] = [...this.etapasDisponibles];

  historialObservaciones: RegistroFlujo[] = [];

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.cargarArticulo(+id);
      } else {
        this.error = 'No se encontró el ID del artículo';
        this.loading = false;
      }
    });
  }

  cargarArticulo(id: number): void {
    this.loading = true;
    this.articulosService.getArticuloFlujo(id).subscribe({
      next: (data) => {
        this.articulo = data;
        this.etapaActualId = data.etapaActual.id;
        this.tituloArticulo = `${data.codigo} - ${data.titulo}`;
        this.actualizarEtapaActual(data.etapaActual.id);
        this.historialObservaciones = this.mapearObservacionesAHistorial(data.observaciones);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar artículo:', err);
        this.error = 'Error al cargar los datos del artículo';
        this.loading = false;
      },
    });
  }

  private actualizarEtapaActual(etapaActualId: number): void {
    this.etapas = this.etapasDisponibles.map((etapa) => ({
      ...etapa,
      activa: etapa.id === etapaActualId,
    }));
  }

  private mapearObservacionesAHistorial(observaciones: ObservacionBackend[] = []): RegistroFlujo[] {
    return observaciones
      .map((obs) => {
        const fecha = new Date(obs.fechaSubida);

        return {
          id: obs.id,
          etapaId: obs.etapa?.id ?? null,
          fechaOrden: fecha.getTime(),
          fecha: this.formatearFecha(fecha),
          autor: obs.usuario?.nombre ?? 'Usuario desconocido',
          rol: obs.usuario?.roles[0]?.nombre ?? 'Sin rol',
          asunto: obs.asunto,
          comentario: obs.comentarios ?? undefined,
          expandido: false,
          archivos: obs.archivos.map((archivo) => ({
            nombre: archivo.archivoNombreOriginal,
            path: archivo.archivoPath,
          })),
        };
      })
      .sort((a, b) => b.fechaOrden - a.fechaOrden);
  }

  toggleRegistro(registro: RegistroFlujo): void {
    registro.expandido = !registro.expandido;
  }

  toggleResumen(): void {
    this.resumenExpandido = !this.resumenExpandido;
  }

  private formatearFecha(fecha: Date): string {
    return fecha.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  descargarArchivo(path: string, nombreOriginal: string): void {
    let filename = path.split('/').pop() || '';
    this.articulosService.descargarArchivo(filename).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreOriginal;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar archivo:', err);
      },
    });
  }

  get etapaActual(): string {
    const etapaActiva = this.etapas.find((etapa) => etapa.activa);
    return etapaActiva?.titulo ?? 'Sin etapa';
  }

  get etiquetaEtapaActual(): string {
    const etapaActiva = this.etapas.find((etapa) => etapa.activa);
    return etapaActiva ? `EN ${etapaActiva.titulo.toUpperCase()}` : 'SIN ETAPA';
  }

  get historialVisible(): RegistroFlujo[] {
    const etapaActiva = this.etapas.find((etapa) => etapa.activa);
    const etapaFiltroId = etapaActiva?.id ?? this.etapaActualId;

    if (!etapaFiltroId) {
      return this.historialObservaciones;
    }

    return this.historialObservaciones.filter((registro) => registro.etapaId === etapaFiltroId);
  }

  obtenerClaseBolitaPorRol(rol: string): string {
    const rolNormalizado = rol
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    switch (rolNormalizado) {
      case 'admin':
        return 'timeline-dot--rol-admin';
      case 'monitor':
        return 'timeline-dot--rol-monitor';
      case 'revisor':
        return 'timeline-dot--rol-revisor';
      case 'director':
        return 'timeline-dot--rol-director';
      case 'autor':
        return 'timeline-dot--rol-autor';
      default:
        return 'timeline-dot--rol-default';
    }
  }

  get fechaInicioEtapaVisible(): string | null {
    const etapaActiva = this.etapas.find((etapa) => etapa.activa);
    const etapaFiltroId = etapaActiva?.id ?? this.etapaActualId;

    if (!this.articulo || !etapaFiltroId) {
      return null;
    }

    const historialDeEtapa = this.articulo.historialEtapas
      .filter((item) => item.etapaId === etapaFiltroId)
      .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());

    const inicioEtapa = historialDeEtapa[0];
    if (!inicioEtapa) {
      return null;
    }

    return this.formatearFecha(new Date(inicioEtapa.fechaInicio));
  }

  get tieneContenidoHistorial(): boolean {
    return Boolean(this.fechaInicioEtapaVisible) || this.historialVisible.length > 0;
  }

  get mostrarMoverArticulo(): boolean {
    return this.siguienteEtapa !== null;
  }

  get esEtapaActualSeleccionada(): boolean {
    if (!this.etapaActualId) {
      return false;
    }

    const etapaActiva = this.etapas.find((etapa) => etapa.activa);
    return etapaActiva?.id === this.etapaActualId;
  }

  get siguienteEtapa(): EtapaFlujo | null {
    if (!this.etapaActualId) {
      return null;
    }

    return this.etapasDisponibles.find((etapa) => etapa.id === this.etapaActualId! + 1) ?? null;
  }

  puedeAccederEtapa(etapaId: number): boolean {
    if (!this.etapaActualId) {
      return true;
    }

    return etapaId <= this.etapaActualId;
  }

  seleccionarEtapa(indice: number): void {
    const etapaSeleccionada = this.etapas[indice];
    if (!etapaSeleccionada || !this.puedeAccederEtapa(etapaSeleccionada.id)) {
      return;
    }

    this.etapas.forEach((etapa, posicion) => {
      etapa.activa = posicion === indice;
    });
  }

  onCreateObservacion(): void {
    this.showCreateModal = true;
    this.cdr.detectChanges();
  }

  abrirConfirmacionMover(): void {
    if (!this.siguienteEtapa || !this.articulo) {
      return;
    }

    this.errorMoverEtapa = null;
    this.showConfirmMoveModal = true;
  }

  cancelarConfirmacionMover(): void {
    if (this.moviendoEtapa) {
      return;
    }

    this.showConfirmMoveModal = false;
  }

  confirmarMoverEtapa(): void {
    if (!this.articulo || !this.siguienteEtapa || this.moviendoEtapa) {
      return;
    }

    this.moviendoEtapa = true;
    this.errorMoverEtapa = null;

    this.articulosService.moverEtapa(this.articulo.id, this.siguienteEtapa.id).subscribe({
      next: () => {
        this.showConfirmMoveModal = false;
        this.moviendoEtapa = false;
        this.cargarArticulo(this.articulo!.id);
        window.location.reload();
      },
      error: (err) => {
        console.error('Error al mover de etapa:', err);
        this.moviendoEtapa = false;
        this.errorMoverEtapa = 'No fue posible mover el artículo a la siguiente etapa.';
      },
    });
  }

  get autoresArticulo(): string {
    if (!this.articulo?.autores?.length) {
      return 'Sin autores registrados';
    }

    return this.articulo.autores.map((autor) => autor.nombre).join(', ');
  }

  get fechaEnvioArticulo(): string {
    if (!this.articulo?.fechaEnvio) {
      return 'Sin fecha de envío';
    }

    return this.formatearFecha(new Date(this.articulo.fechaEnvio));
  }

  get palabrasClaveArticulo(): string {
    if (!this.articulo?.palabrasClave?.length) {
      return 'Sin palabras clave';
    }

    return this.articulo.palabrasClave.join(', ');
  }

  get resumenArticulo(): string {
    return this.articulo?.resumen ?? 'Sin resumen';
  }

  get temasArticulo(): string {
    if (!this.articulo?.temas?.length) {
      return 'Sin temas registrados';
    }

    return this.articulo.temas.join(', ');
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    window.location.reload();
    this.cdr.detectChanges();
  }
}
