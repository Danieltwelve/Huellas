import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {
  EdicionesRevistaService,
  EdicionRevistaBackend,
} from '../../../../../core/ediciones-revista/ediciones.revista.service';
import { ModalCrear } from './modal-crear/modal-crear';
import { ModalEditar, OpenEditarEdicionData } from './modal-editar/modal-editar';
import { ModalEliminar } from './modal-eliminar/modal-eliminar';
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, ModalCrear, FormsModule, ModalEditar, ModalEliminar],
  templateUrl: './ediciones.html',
  styleUrl: './ediciones.css',
})
export class Ediciones implements OnInit {
  private edicionesService = inject(EdicionesRevistaService);
  private cdr = inject(ChangeDetectorRef);
  unpublishing = false;
  terminoBusqueda: string = '';
  filtroEstado: string = '';

  @Output() despublicada = new EventEmitter<{ success: boolean; message: string }>();
  @Output() edicionCreada = new EventEmitter<void>();

  modalDespublicarAbierto = false;
  edicionADespublicar: EdicionItem | null = null;

  @ViewChild(ModalCrear) modalCrear!: ModalCrear;
  @ViewChild(ModalEditar) modalEditar!: ModalEditar;
  @ViewChild(ModalEliminar) modalEliminar!: ModalEliminar;

  ediciones: EdicionItem[] = [];
  loading = true;

  ngOnInit(): void {
    this.cargarEdiciones();
  }

  abrirModalCrear(): void {
    this.modalCrear.openModal();
  }

  abrirModalDespublicar(edicion: EdicionItem): void {
    this.edicionADespublicar = edicion;
    this.modalDespublicarAbierto = true;
  }

  cerrarModalDespublicar(): void {
    this.modalDespublicarAbierto = false;
    this.edicionADespublicar = null;
  }

  confirmarDespublicar(): void {
    if (!this.edicionADespublicar || this.unpublishing) return;

    this.unpublishing = true;
    this.edicionesService.unpublishEdicion(this.edicionADespublicar.id).subscribe({
      next: (res) => {
        this.unpublishing = false;
        this.cerrarModalDespublicar();
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

  abrirModalEditar(edicion: EdicionItem): void {
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
    this.edicionesService.getEdiciones().subscribe({
      // ← cambiado a getEdiciones()
      next: ({ data }) => {
        this.ediciones = data.map((backendEdicion) => this.mapToEdicionItem(backendEdicion));
        this.cargarConteosArticulos();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.ediciones = [];
      },
    });
  }

  private cargarConteosArticulos(): void {
    this.ediciones.forEach((edicion) => {
      this.edicionesService.getConteoArticulos(edicion.id).subscribe({
        next: ({ data }) => {
          edicion.numeroArticulos = data.numero_articulos;
          this.cdr.detectChanges();
        },
        error: () => {
          edicion.numeroArticulos = 0;
        },
      });
    });
  }

  private mapToEdicionItem(backend: EdicionRevistaBackend): EdicionItem {
    const estadoNombre = backend.estado_id?.estado ?? 'SIN ESTADO';
    const estadoId = backend.estado_id?.id ?? this.mapearEstadoId(estadoNombre);

    return {
      id: backend.id,
      titulo: backend.titulo,
      volumen: backend.volumen,
      numero: backend.numero,
      anio: backend.anio,
      fecha_estado: backend.fecha_estado,
      estado: estadoNombre,
      estadoId: estadoId,
      numeroArticulos: 0,
      portada: null,
    };
  }

  get edicionesFiltradas(): EdicionItem[] {
    let resultado = this.ediciones;
    if (this.terminoBusqueda.trim()) {
      const busqueda = this.terminoBusqueda.toLowerCase().trim();
      resultado = resultado.filter((edicion) => {
        const textoEdicion =
          `Vol. ${edicion.volumen} Núm. ${edicion.numero} (${edicion.anio}): ${edicion.titulo}`.toLowerCase();
        const fechaEstado = edicion.fecha_estado.toLowerCase();
        const articulos = edicion.numeroArticulos.toString();
        const estado = edicion.estado.toLowerCase();
        return (
          textoEdicion.includes(busqueda) ||
          fechaEstado.includes(busqueda) ||
          articulos.includes(busqueda) ||
          estado.includes(busqueda)
        );
      });
    }
    if (this.filtroEstado) {
      resultado = resultado.filter((edicion) => edicion.estado === this.filtroEstado);
    }
    return resultado;
  }

  onEdicionCreada(): void {
    this.cargarEdiciones();
    this.edicionCreada.emit();
  }

  trackEdicion(_index: number, edicion: { id: number }): number | null {
    return edicion?.id ?? null;
  }
}
