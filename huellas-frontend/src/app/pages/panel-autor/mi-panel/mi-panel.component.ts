import { Component, inject, OnInit } from '@angular/core';
import { ArticulosAutorService, ArticuloAutor } from '../../../core/articulos/articulos-autor.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mi-panel',
  standalone: true,
  imports: [],
  templateUrl: './mi-panel.component.html',
  styleUrls: ['./mi-panel.component.css']
})
export class MiPanelComponent implements OnInit {
  private articulosService = inject(ArticulosAutorService);
  private router = inject(Router);

  articulos: ArticuloAutor[] = [];
  loading = true;
  estadoFiltro: 'todos' | 'revision' | 'correccion' | 'publicado' = 'todos';
  readonly hoy = new Date();

  get totalArticulos() { return this.articulos.length; }
  get enRevision() { return this.articulos.filter(a => a.etapa_nombre !== 'Publicado' && a.etapa_nombre !== 'Correcciones pendientes').length; }
  get correccionPendiente() { return this.articulos.filter(a => a.etapa_nombre === 'Correcciones pendientes').length; }
  get publicados() { return this.articulos.filter(a => a.etapa_nombre === 'Publicado').length; }
  get proximoVencimiento() {
    const pendientes = this.articulos
      .filter((articulo) => articulo.etapa_nombre === 'Correcciones pendientes' && articulo.fecha_inicio)
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
      const estado = this.getEstadoArticulo(articulo.etapa_nombre);
      return estado === this.estadoFiltro;
    });
  }

  ngOnInit() {
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

  getEstadoArticulo(etapa: string): 'revision' | 'correccion' | 'publicado' {
    const valor = etapa.toLowerCase();
    if (valor.includes('publicado')) return 'publicado';
    if (valor.includes('correccion')) return 'correccion';
    return 'revision';
  }

  getEstadoLabel(etapa: string): string {
    const estado = this.getEstadoArticulo(etapa);
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

  getEstadoClass(etapa: string): string {
    const estado = this.getEstadoArticulo(etapa);
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
}
