import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, OnInit, Output, ViewChild } from '@angular/core';
import {
  EdicionesRevistaService,
  EdicionPublicadaBackend,
} from '../../../../../core/ediciones-revista/ediciones.revista.service';
import { ModalCrear } from './modal-crear/modal-crear';
import { ModalEditar, OpenEditarEdicionData } from './modal-editar/modal-editar';

interface EdicionItem {
  id: number;
  titulo: string;
  volumen: number;
  numero: number;
  anio: number;
  fecha_estado: string;
  estado: string;
  estadoId: number;
  numeroArticulos: number;
  portada: string | null;
}

@Component({
  selector: 'app-ediciones',
  standalone: true,
  imports: [CommonModule, ModalCrear, ModalEditar],
  templateUrl: './ediciones.html',
  styleUrl: './ediciones.css',
})
export class Ediciones implements OnInit {
  private edicionesService = inject(EdicionesRevistaService);
  unpublishing = false;

  @Output() despublicada = new EventEmitter<{ success: boolean; message: string }>();
  @Output() edicionCreada = new EventEmitter<void>();

  modalEliminarAbierto = false;
  edicionAEliminar: EdicionItem | null = null;

  @ViewChild(ModalCrear) modalCrear!: ModalCrear;
  @ViewChild(ModalEditar) modalEditar!: ModalEditar;

  edicionesPublicadas: EdicionItem[] = [];
  loading = true;

  ngOnInit(): void {
    this.cargarEdiciones();
  }

  abrirModalCrear(): void {
    this.modalCrear.openModal();
  }

  abrirModalEliminar(edicion: EdicionItem): void {
    this.edicionAEliminar = edicion;
    this.modalEliminarAbierto = true;
  }

  cerrarModalEliminar(): void {
    this.modalEliminarAbierto = false;
    this.edicionAEliminar = null;
  }

  confirmarEliminar(): void {
    if (!this.edicionAEliminar || this.unpublishing) return;

    this.unpublishing = true;
    this.edicionesService.unpublishEdicion(this.edicionAEliminar.id).subscribe({
      next: (res) => {
        this.unpublishing = false;
        this.cerrarModalEliminar();
        this.despublicada.emit({ success: true, message: res.message });
        this.cargarEdiciones();
      },
      error: (err) => {
        this.unpublishing = false;
        const errorMsg = err?.error?.message || err?.message || 'Error al despublicar la edición.';
        this.despublicada.emit({ success: false, message: errorMsg });
      },
    });
  }

  abrirModalEditar(edicion: any): void {
    const edicionTexto = `Vol. ${edicion.volumen} Núm. ${edicion.numero} (${edicion.anio}): ${edicion.titulo}`;

    const data: OpenEditarEdicionData = {
      edicionId: edicion.id,
      edicionTexto: edicionTexto,
      titulo: edicion.titulo,
      volumen: edicion.volumen,
      numero: edicion.numero,
      anio: edicion.anio,
      estado_id: this.mapearEstadoId(edicion.estado),
      portadaUrl: edicion.portada,
    };
    this.modalEditar.openModal(data);
  }

  private mapearEstadoId(estado: string): number {
    switch (estado) {
      case 'ABIERTA':
        return 1;
      case 'PUBLICADA':
        return 2;
      default:
        return 1;
    }
  }

  cargarEdiciones(): void {
    this.loading = true;
    this.edicionesService.getEdicionesPublicadas().subscribe({
      next: ({ data }) => {
        this.edicionesPublicadas = data.map((backendEdicion) =>
          this.mapToEdicionItem(backendEdicion),
        );
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.edicionesPublicadas = [];
      },
    });
  }

  private mapToEdicionItem(backend: EdicionPublicadaBackend): EdicionItem {
    const estadoNombre = 'PUBLICADA';
    const estadoIdNum = 2;

    return {
      id: backend.id,
      titulo: backend.titulo,
      volumen: backend.volumen,
      numero: backend.numero,
      anio: backend.anio,
      fecha_estado: backend.fecha_estado,
      estado: estadoNombre,
      estadoId: estadoIdNum,
      numeroArticulos: backend.numeroArticulos,
      portada: backend.portada || null,
    };
  }

  onEdicionCreada(): void {
    this.cargarEdiciones();
    this.edicionCreada.emit();
  }

  trackEdicion(_index: number, edicion: { id: number }): number | null {
    return edicion?.id ?? null;
  }
}
