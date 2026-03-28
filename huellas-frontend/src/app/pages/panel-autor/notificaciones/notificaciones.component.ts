import { Component } from '@angular/core';

interface Notificacion {
  titulo: string;
  detalle: string;
  fecha: string;
  tipo: 'accion' | 'informacion' | 'exito';
  leida: boolean;
}

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.css']
})
export class NotificacionesComponent {
  filtro: 'todas' | 'no-leidas' = 'todas';

  notificaciones: Notificacion[] = [
    {
      titulo: 'Correcciones solicitadas',
      detalle: 'Tu articulo HU-CE-2026-007 requiere ajustes de forma antes de pasar a edicion.',
      fecha: 'Hace 2 horas',
      tipo: 'accion',
      leida: false,
    },
    {
      titulo: 'Antiplagio aprobado',
      detalle: 'El manuscrito HU-CP-2026-001 supero validacion de similitud sin observaciones.',
      fecha: 'Ayer',
      tipo: 'exito',
      leida: true,
    },
    {
      titulo: 'Nuevo recurso disponible',
      detalle: 'Se agrego una nueva plantilla de carta de originalidad para envios 2026.',
      fecha: 'Hace 3 dias',
      tipo: 'informacion',
      leida: true,
    },
  ];

  get visibles(): Notificacion[] {
    if (this.filtro === 'no-leidas') {
      return this.notificaciones.filter((n) => !n.leida);
    }
    return this.notificaciones;
  }

  setFiltro(value: 'todas' | 'no-leidas') {
    this.filtro = value;
  }

  marcarTodasLeidas() {
    this.notificaciones = this.notificaciones.map((n) => ({ ...n, leida: true }));
  }
}
