import { Component } from '@angular/core';
import { NOTIFICACIONES_REVISOR_MOCK } from '../panel-revisor.data';

@Component({
  selector: 'app-notificaciones-revisor',
  standalone: true,
  templateUrl: './notificaciones-revisor.component.html',
  styleUrls: ['./notificaciones-revisor.component.css'],
})
export class NotificacionesRevisorComponent {
  notificaciones = NOTIFICACIONES_REVISOR_MOCK.map((item) => ({ ...item, leida: false }));
  filtro: 'todas' | 'no-leidas' = 'todas';

  get visibles() {
    if (this.filtro === 'no-leidas') {
      return this.notificaciones.filter((item) => !item.leida);
    }
    return this.notificaciones;
  }

  setFiltro(value: 'todas' | 'no-leidas'): void {
    this.filtro = value;
  }

  marcarLeida(id: string): void {
    this.notificaciones = this.notificaciones.map((item) =>
      item.id === id ? { ...item, leida: true } : item,
    );
  }
}
