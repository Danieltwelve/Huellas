import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ARTICULOS_ASIGNADOS_MOCK } from '../panel-revisor.data';

@Component({
  selector: 'app-realizar-revision',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './realizar-revision.component.html',
  styleUrls: ['./realizar-revision.component.css'],
})
export class RealizarRevisionComponent {
  articulos = ARTICULOS_ASIGNADOS_MOCK;

  articuloSeleccionadoId = this.articulos[0]?.id ?? 0;
  recomendacion: 'aceptar' | 'ajustes' | 'rechazar' = 'ajustes';
  calificacion = 4;
  comentarios = '';
  mensaje = '';

  get articuloSeleccionado() {
    return this.articulos.find((item) => item.id === this.articuloSeleccionadoId) ?? null;
  }

  enviarRevision(): void {
    if (!this.articuloSeleccionado) {
      this.mensaje = 'Selecciona un articulo para enviar la revision.';
      return;
    }

    this.mensaje = `Revision enviada para ${this.articuloSeleccionado.codigo} con recomendacion: ${this.recomendacion}.`;
  }
}
