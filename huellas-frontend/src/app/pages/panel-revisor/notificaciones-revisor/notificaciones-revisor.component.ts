import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NOTIFICACIONES_REVISOR_MOCK } from '../panel-revisor.data';
import { NotificacionRevisorDto, RevisoresService } from '../../../core/revisores/revisores.service';

@Component({
  selector: 'app-notificaciones-revisor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificaciones-revisor.component.html',
  styleUrls: ['./notificaciones-revisor.component.css'],
})
export class NotificacionesRevisorComponent implements OnInit {
  private readonly revisoresService = inject(RevisoresService);
  private readonly router = inject(Router);

  notificaciones: Array<NotificacionRevisorDto & { leida: boolean; tipo?: string }> = [];
  filtro: 'todas' | 'no-leidas' = 'todas';

  ngOnInit(): void {
    const idsLeidos = this.obtenerIdsLeidos();
    this.revisoresService.getNotificacionesRevisor().subscribe({
      next: (data) => {
        this.notificaciones = data.map((item) => {
          const mockItem = NOTIFICACIONES_REVISOR_MOCK.find(m => m.id === item.id);
          return {
            ...item,
            leida: idsLeidos.has(item.id),
            tipo: mockItem ? mockItem.tipo : (item.id.startsWith('ASIG') ? 'asignacion' : 'mensaje')
          };
        });
      },
      error: () => {
        this.notificaciones = NOTIFICACIONES_REVISOR_MOCK.map((item) => ({
          ...item,
          leida: idsLeidos.has(item.id),
        }));
      },
    });
  }

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
      item.id === id ? { ...item, leida: true } : item
    );
    this.guardarIdsLeidos(new Set(this.notificaciones.filter((item) => item.leida).map((item) => item.id)));
  }

  marcarTodasComoLeidas(): void {
    this.notificaciones = this.notificaciones.map((item) => ({ ...item, leida: true }));
    this.guardarIdsLeidos(new Set(this.notificaciones.map((item) => item.id)));
  }

  abrirNotificacion(notificacion: NotificacionRevisorDto): void {
    this.marcarLeida(notificacion.id);
    if (notificacion.enlace) {
      this.router.navigateByUrl(notificacion.enlace);
      return;
    }

    if (typeof notificacion.articuloId === 'number') {
      this.router.navigateByUrl(`/panel-revisor/realizar-revision?articuloId=${notificacion.articuloId}`);
    }
  }

  getArticuloRef(item: NotificacionRevisorDto): string | null {
    if (item.codigoArticulo) {
      return item.codigoArticulo;
    }
    const match = item.detalle.match(/(REV-\d+-\d+|FERCH-\d+)/i);
    if (match) {
      return match[1];
    }
    return null;
  }

  getTiempoTranscurrido(fechaStr: string): string {
    const fecha = new Date(fechaStr);
    if (Number.isNaN(fecha.getTime())) {
      return '';
    }

    const diffMs = Date.now() - fecha.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHor = Math.floor(diffMin / 60);
    const diffDia = Math.floor(diffHor / 24);

    if (diffSec < 60) {
      return 'Hace unos segundos';
    }
    if (diffMin < 60) {
      return `Hace ${diffMin} min`;
    }
    if (diffHor < 24) {
      return `Hace ${diffHor} h`;
    }
    return `Hace ${diffDia} d`;
  }

  private obtenerIdsLeidos(): Set<string> {
    try {
      const raw = localStorage.getItem('revisor-notificaciones-leidas');
      if (!raw) {
        return new Set<string>();
      }

      const parsed = JSON.parse(raw) as string[];
      return new Set(parsed.filter((id) => typeof id === 'string'));
    } catch {
      return new Set<string>();
    }
  }

  private guardarIdsLeidos(ids: Set<string>): void {
    localStorage.setItem('revisor-notificaciones-leidas', JSON.stringify(Array.from(ids)));
  }
}
