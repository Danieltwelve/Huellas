import { Component } from '@angular/core';
import { ARTICULOS_ASIGNADOS_MOCK } from '../panel-revisor.data';

@Component({
  selector: 'app-articulos-asignados',
  standalone: true,
  templateUrl: './articulos-asignados.component.html',
  styleUrls: ['./articulos-asignados.component.css'],
})
export class ArticulosAsignadosComponent {
  articulos = ARTICULOS_ASIGNADOS_MOCK;

  getEtiquetaEstado(estado: string): string {
    if (estado === 'en-proceso') {
      return 'En revision';
    }
    if (estado === 'enviado') {
      return 'Enviado';
    }
    return 'Pendiente';
  }
}
