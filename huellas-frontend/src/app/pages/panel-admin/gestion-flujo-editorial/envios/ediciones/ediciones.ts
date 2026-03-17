import { Component, inject, OnInit } from '@angular/core';
import {
  EdicionRevistaBackend,
  EdicionesRevistaService,
} from '../../../../../core/ediciones-revista/ediciones.revista.service';
import { CrearEdicion } from './crear-edicion/crear-edicion';
import { ModalEliminarEdicion } from './modal-eliminar-edicion/modal-eliminar-edicion';
import { ModalEditarEdicion } from './modal-editar-edicion/modal-editar-edicion';

type EstadoEdicion = 'ABIERTA' | 'PUBLICADA' | 'EN REVISION';

interface EdicionItem {
  id: number;
  edicion: string;
  titulo: string;
  volumen: number;
  numero: number;
  anio: number;
  fechaEstado: string;
  articulos: string;
  estado: EstadoEdicion | string;
  estadoId: number;
}

@Component({
  selector: 'app-ediciones',
  standalone: true,
  imports: [CrearEdicion, ModalEliminarEdicion, ModalEditarEdicion],
  templateUrl: './ediciones.html',
  styleUrl: './ediciones.scss',
})
export class Ediciones implements OnInit {
  private readonly edicionesRevistaService = inject(EdicionesRevistaService);

  ediciones: EdicionItem[] = [];
  requestError = '';

  ngOnInit(): void {
    this.loadEdiciones();
  }

  isEdicionAbierta(estado: EstadoEdicion | string): boolean {
    return estado.toUpperCase() === 'ABIERTA';
  }

  countByEstado(estado: string): number {
    const expected = estado.toUpperCase();
    return this.ediciones.filter((edicion) => edicion.estado.toUpperCase() === expected).length;
  }

  loadEdiciones(): void {
    this.requestError = '';

    this.edicionesRevistaService.getEdiciones().subscribe({
      next: ({ data }) => {
        this.ediciones = data.map((edicion) => this.mapEdicionToTableItem(edicion));
      },
      error: (error) => {
        const backendMessage = Array.isArray(error?.error?.message)
          ? error.error.message.join(', ')
          : error?.error?.message;

        this.requestError =
          backendMessage || 'No se pudo cargar el listado de ediciones.';
      },
    });
  }

  private mapEdicionToTableItem(edicion: EdicionRevistaBackend): EdicionItem {
    const estadoNombre = edicion.estado?.estado ?? 'SIN ESTADO';

    return {
      id: edicion.id,
      edicion: `Vol. ${edicion.volumen} Núm. ${edicion.numero} (${edicion.anio}): ${edicion.titulo}`,
      titulo: edicion.titulo,
      volumen: edicion.volumen,
      numero: edicion.numero,
      anio: edicion.anio,
      fechaEstado: edicion.fechaEstado,
      articulos: '--',
      estado: estadoNombre,
      estadoId: edicion.estado?.id ?? this.mapEstadoNombreToId(estadoNombre),
    };
  }

  private mapEstadoNombreToId(estadoNombre: string): number {
    switch (estadoNombre.toUpperCase()) {
      case 'ABIERTA':
        return 1;
      case 'EN REVISION':
        return 2;
      case 'PUBLICADA':
        return 3;
      default:
        return 1;
    }
  }
}
