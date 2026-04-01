import { Component, inject, OnInit } from '@angular/core';
import { ArticulosAutorService, ArticuloAutor } from '../../../core/articulos/articulos-autor.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mi-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './mi-panel.component.html',
  styleUrls: ['./mi-panel.component.css']
})
export class MiPanelComponent implements OnInit {
  private articulosService = inject(ArticulosAutorService);
  private router = inject(Router);

  articulos: ArticuloAutor[] = [];
  loading = true;
  mensajeCorreccion: string | null = null;
  errorCorreccion: string | null = null;
  articuloCorreccionActivo: ArticuloAutor | null = null;
  archivoCorreccionActivo: File | null = null;
  nombreArchivoCorreccionActivo = '';
  comentariosCorreccionActivo = '';
  errorModalCorreccion: string | null = null;
  arrastrandoArchivoCorreccion = false;
  subiendoCorreccionIds = new Set<number>();
  estadoFiltro: 'todos' | 'revision' | 'correccion' | 'publicado' = 'todos';
  readonly hoy = new Date();

  get totalArticulos() { return this.articulos.length; }
  get enRevision() { return this.articulos.filter(a => this.getEstadoArticulo(a) === 'revision').length; }
  get correccionPendiente() { return this.articulos.filter(a => this.getEstadoArticulo(a) === 'correccion').length; }
  get publicados() { return this.articulos.filter(a => this.getEstadoArticulo(a) === 'publicado').length; }
  get proximoVencimiento() {
    const pendientes = this.articulos
      .filter((articulo) => articulo.correccion_pendiente && articulo.fecha_inicio)
      .map((articulo) => new Date(articulo.fecha_inicio as string))
      .filter((fecha) => !isNaN(fecha.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    return pendientes[0] ?? null;
  }

  get articulosFiltrados(): ArticuloAutor[] {
    if (this.estadoFiltro === 'todos') {
      return this.articulos;
    }

    return this.articulos.filter((articulo) => {
      const estado = this.getEstadoArticulo(articulo);
      return estado === this.estadoFiltro;
    });
  }

  ngOnInit() {
    this.cargarArticulos();
  }

  private cargarArticulos(): void {
    this.articulosService.getMisArticulos().subscribe({
      next: (data) => {
        this.articulos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  setFiltro(filtro: 'todos' | 'revision' | 'correccion' | 'publicado') {
    this.estadoFiltro = filtro;
  }

  getEstadoArticulo(articulo: ArticuloAutor): 'revision' | 'correccion' | 'publicado' {
    if (articulo.correccion_pendiente) {
      return 'correccion';
    }

    const valor = articulo.etapa_nombre.toLowerCase();
    if (valor.includes('publicado')) return 'publicado';
    return 'revision';
  }

  getEstadoLabel(articulo: ArticuloAutor): string {
    const estado = this.getEstadoArticulo(articulo);
    if (estado === 'publicado') return 'Publicado';
    if (estado === 'correccion') return 'Correccion Pendiente';
    return 'En Revision';
  }

  getEtapaClass(etapa: string): string {
    const valor = etapa.toLowerCase();
    if (valor.includes('publicado')) return 'badge-green';
    if (valor.includes('correccion')) return 'badge-orange';
    if (valor.includes('evaluacion') || valor.includes('revision')) return 'badge-yellow';
    return 'badge-blue';
  }

  getEstadoClass(articulo: ArticuloAutor): string {
    const estado = this.getEstadoArticulo(articulo);
    if (estado === 'publicado') return 'state-published';
    if (estado === 'correccion') return 'state-pending';
    return 'state-review';
  }

  formatFecha(fecha: string | null): string {
    if (!fecha) return 'Sin fecha';
    const valor = new Date(fecha);
    if (isNaN(valor.getTime())) return 'Sin fecha';

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(valor);
  }

  etapaEnMayusculas(etapa: string): string {
    return etapa.toUpperCase();
  }

  irANuevoArticulo(event: Event): void {
    event.preventDefault();
    this.router.navigate(['/panel-autor/nuevo-articulo']);
  }

  verSeguimientoArticulo(articuloId: number): void {
    this.router.navigate(['/panel-autor/timeline'], {
      queryParams: { articuloId },
    });
  }

  abrirModalCorreccion(articulo: ArticuloAutor): void {
    if (!articulo.correccion_pendiente || this.isSubiendoCorreccion(articulo.id)) {
      return;
    }

    this.articuloCorreccionActivo = articulo;
    this.archivoCorreccionActivo = null;
    this.nombreArchivoCorreccionActivo = '';
    this.comentariosCorreccionActivo = '';
    this.errorModalCorreccion = null;
  }

  cerrarModalCorreccion(): void {
    this.articuloCorreccionActivo = null;
    this.archivoCorreccionActivo = null;
    this.nombreArchivoCorreccionActivo = '';
    this.comentariosCorreccionActivo = '';
    this.errorModalCorreccion = null;
    this.arrastrandoArchivoCorreccion = false;
  }

  onDragOverCorreccion(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoCorreccion = true;
  }

  onDragLeaveCorreccion(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoCorreccion = false;
  }

  onDropArchivoCorreccion(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoCorreccion = false;

    const file = event.dataTransfer?.files?.item(0) ?? null;
    if (!file) {
      return;
    }

    this.setArchivoCorreccion(file);
  }

  private setArchivoCorreccion(file: File): void {
    const nombre = file.name.toLowerCase();
    const extensionValida = /\.(pdf|doc|docx)$/.test(nombre);

    if (!extensionValida) {
      this.archivoCorreccionActivo = null;
      this.nombreArchivoCorreccionActivo = '';
      this.errorModalCorreccion = 'Formato no permitido. Usa PDF, DOC o DOCX.';
      return;
    }

    this.archivoCorreccionActivo = file;
    this.nombreArchivoCorreccionActivo = file.name;
    this.errorModalCorreccion = null;
  }

  limpiarArchivoCorreccion(): void {
    this.archivoCorreccionActivo = null;
    this.nombreArchivoCorreccionActivo = '';
    this.errorModalCorreccion = null;
  }

  onArchivoModalCorreccionSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;

    if (!file) {
      return;
    }

    this.setArchivoCorreccion(file);
  }

  enviarCorreccionModal(): void {
    if (!this.articuloCorreccionActivo) {
      return;
    }

    if (!this.archivoCorreccionActivo) {
      this.errorModalCorreccion = 'Debes seleccionar un archivo para enviar la correccion.';
      return;
    }

    const articulo = this.articuloCorreccionActivo;
    const archivo = this.archivoCorreccionActivo;
    const comentarios = this.comentariosCorreccionActivo.trim();

    this.subiendoCorreccionIds.add(articulo.id);
    this.mensajeCorreccion = null;
    this.errorCorreccion = null;
    this.errorModalCorreccion = null;

    this.articulosService
      .enviarCorreccion(articulo.id, archivo, comentarios || undefined)
      .subscribe({
      next: () => {
        this.subiendoCorreccionIds.delete(articulo.id);
        this.mensajeCorreccion = 'Correccion enviada correctamente.';
        this.cerrarModalCorreccion();
        this.cargarArticulos();
      },
      error: (err) => {
        console.error('Error enviando correccion:', err);
        this.subiendoCorreccionIds.delete(articulo.id);
        const mensaje = err?.error?.message ?? 'No fue posible enviar la correccion.';
        this.errorCorreccion = mensaje;
        this.errorModalCorreccion = mensaje;
      },
      });
  }

  isSubiendoCorreccion(articuloId: number): boolean {
    return this.subiendoCorreccionIds.has(articuloId);
  }
}
