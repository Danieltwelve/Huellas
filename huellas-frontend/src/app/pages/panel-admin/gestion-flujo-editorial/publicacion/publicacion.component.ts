import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ArticuloPublicacionBackend,
  ArticulosService,
} from '../../../../core/articulos/articulos.service';
import {
  EdicionPublicadaBackend,
  EdicionesRevistaService,
  PublicarEdicionRevistaPayload,
} from '../../../../core/ediciones-revista/ediciones.revista.service';

@Component({
  selector: 'app-publicacion-editorial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './publicacion.html',
  styleUrl: './publicacion.css',
})
export class PublicacionEditorial implements OnInit {
  private readonly articulosService = inject(ArticulosService);
  private readonly edicionesService = inject(EdicionesRevistaService);

  loading = true;
  publishing = false;
  error: string | null = null;
  success: string | null = null;

  articulosDisponibles: ArticuloPublicacionBackend[] = [];
  edicionesPublicadas: EdicionPublicadaBackend[] = [];
  selectedArticleIds: number[] = [];

  titulo = '';
  volumen: number | null = null;
  numero: number | null = null;
  anio: number | null = new Date().getFullYear();

  ngOnInit(): void {
    this.cargarDatos();
  }

  private cargarDatos(): void {
    this.loading = true;
    this.error = null;

    this.articulosService.getArticulosEnPublicacion().subscribe({
      next: (articulos) => {
        this.articulosDisponibles = [...articulos].sort((a, b) => a.codigo.localeCompare(b.codigo));
        this.edicionesService.getEdicionesPublicadas().subscribe({
          next: ({ data }) => {
            this.edicionesPublicadas = data;
            this.loading = false;
          },
          error: () => {
            this.edicionesPublicadas = [];
            this.loading = false;
          },
        });
      },
      error: () => {
        this.articulosDisponibles = [];
        this.edicionesPublicadas = [];
        this.loading = false;
        this.error = 'No se pudieron cargar los artículos disponibles para publicación.';
      },
    });
  }

  get totalSeleccionados(): number {
    return this.selectedArticleIds.length;
  }

  get cuposRestantes(): number {
    return Math.max(0, 10 - this.selectedArticleIds.length);
  }

  get puedePublicar(): boolean {
    return (
      !this.publishing &&
      this.selectedArticleIds.length === 10 &&
      Boolean(this.titulo.trim()) &&
      Boolean(this.volumen && this.volumen > 0) &&
      Boolean(this.numero && this.numero > 0) &&
      Boolean(this.anio && this.anio >= 1900)
    );
  }

  isSeleccionado(articuloId: number): boolean {
    return this.selectedArticleIds.includes(articuloId);
  }

  toggleArticulo(articuloId: number): void {
    this.error = null;
    this.success = null;

    if (this.isSeleccionado(articuloId)) {
      this.selectedArticleIds = this.selectedArticleIds.filter((id) => id !== articuloId);
      return;
    }

    if (this.selectedArticleIds.length >= 10) {
      this.error = 'Solo puedes seleccionar 10 artículos por edición.';
      return;
    }

    this.selectedArticleIds = [...this.selectedArticleIds, articuloId];
  }

  limpiarFormulario(): void {
    this.titulo = '';
    this.volumen = null;
    this.numero = null;
    this.anio = new Date().getFullYear();
    this.selectedArticleIds = [];
    this.error = null;
  }

  publicarEdicion(): void {
    this.error = null;
    this.success = null;

    if (!this.puedePublicar) {
      this.error = 'Completa los datos de la edición y selecciona exactamente 10 artículos.';
      return;
    }

    const payload: PublicarEdicionRevistaPayload = {
      titulo: this.titulo.trim(),
      volumen: this.volumen!,
      numero: this.numero!,
      anio: this.anio!,
      fechaEstado: new Date().toISOString(),
      articuloIds: this.selectedArticleIds,
    };

    this.publishing = true;
    this.edicionesService.publicarEdicion(payload).subscribe({
      next: ({ message }) => {
        this.success = message || 'Edición publicada exitosamente.';
        this.publishing = false;
        this.limpiarFormulario();
        this.cargarDatos();
      },
      error: (err) => {
        this.publishing = false;
        this.error = err?.error?.message ?? 'No se pudo publicar la edición.';
      },
    });
  }

  trackArticulo(_: number, articulo: ArticuloPublicacionBackend): number {
    return articulo.id;
  }

  trackEdicion(_: number, edicion: EdicionPublicadaBackend): number {
    return edicion.id;
  }
}