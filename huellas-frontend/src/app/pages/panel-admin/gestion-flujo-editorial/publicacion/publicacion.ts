// publicacion.ts (versión simplificada)
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  EdicionesRevistaService,
  EdicionRevistaBackend,
} from '../../../../core/ediciones-revista/ediciones.revista.service';
import { Ediciones } from './ediciones/ediciones';
import { Articulos } from './articulos/articulos';

@Component({
  selector: 'app-publicacion',
  standalone: true,
  imports: [CommonModule, FormsModule, Ediciones, Articulos],
  templateUrl: './publicacion.html',
  styleUrl: './publicacion.css',
})
export class Publicacion implements OnInit {
  private edicionesService = inject(EdicionesRevistaService);

  errorPublicacion: string | null = null;
  ediciones: EdicionRevistaBackend[] = [];
  edicionesPublicadas: Array<any> = [];
  loading = true;
  loadingPublicadas = true;
  error: string | null = null;
  success: string | null = null;
  publishing = false;

  edicionIdSeleccionada: number | null = null;

  selectedArticuloIds: number[] = [];

  @ViewChild(Articulos) articulosComponent!: Articulos;
  @ViewChild(Ediciones) edicionesComponent!: Ediciones;

  ngOnInit(): void {
    this.cargarEdiciones();
  }

  public cargarEdiciones(): void {
    this.loading = true;
    this.edicionesService.getEdiciones().subscribe({
      next: ({ data }) => {
        this.ediciones = (data ?? []).filter((edicion) => edicion.estado_id?.id !== 2);
        this.loading = false;
      },
      error: () => {
        this.ediciones = [];
        this.loading = false;
        this.error = 'No se pudieron cargar las ediciones.';
      },
    });
  }

  limpiarFormulario(): void {
    this.edicionIdSeleccionada = null;
    this.selectedArticuloIds = []; // reiniciar selección
    this.error = null;
    this.success = null;
  }

  onSeleccionArticulosCambia(nuevosIds: number[]): void {
    this.selectedArticuloIds = nuevosIds;
    this.error = null;
    this.errorPublicacion = null;
  }

  onEdicionCambia(): void {
    this.errorPublicacion = null;
    this.error = null;
  }

  get puedePublicar(): boolean {
    return (
      !this.publishing &&
      this.selectedArticuloIds.length === 10 &&
      this.edicionIdSeleccionada != null
    );
  }

  publicarEdicion(): void {
    this.error = null;
    this.errorPublicacion = null;
    this.success = null;

    if (this.selectedArticuloIds.length !== 10) {
      this.errorPublicacion = `Debes seleccionar exactamente 10 artículos. Actualmente tienes ${this.selectedArticuloIds.length}.`;
      return;
    }

    if (!this.edicionIdSeleccionada) {
      this.errorPublicacion = 'Selecciona una edición antes de publicar.';
      return;
    }

    const payload = {
      edicionId: this.edicionIdSeleccionada,
      articuloIds: this.selectedArticuloIds,
    };

    this.publishing = true;
    this.edicionesService.publicarEdicion(payload).subscribe({
      next: (res) => {
        this.success = res?.message ?? 'Edición publicada correctamente.';
        this.publishing = false;
        this.limpiarFormulario();
        this.cargarEdiciones();
        this.articulosComponent?.recargarArticulos();
        this.edicionesComponent?.cargarEdiciones();
      },
      error: (err) => {
        this.error = err?.message ?? 'Error al publicar edición.';
        this.publishing = false;
      },
    });
  }

  onDespublicada(event: { success: boolean; message: string }): void {
    if (event.success) {
      this.success = event.message;
      this.articulosComponent?.recargarArticulos();
      this.edicionesComponent?.cargarEdiciones();
      this.cargarEdiciones();
    } else {
      this.error = event.message;
    }
    setTimeout(() => {
      if (this.success === event.message) this.success = null;
      if (this.error === event.message) this.error = null;
    }, 5000);
  }

  trackEdicion(_index: number, edicion: { id: number }): number | null {
    return edicion?.id ?? null;
  }
}
