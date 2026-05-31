import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NOTIFICACIONES_REVISOR_MOCK } from '../panel-revisor.data';
import { NotificacionRevisorDto, RevisoresService } from '../../../core/revisores/revisores.service';

@Component({
  selector: 'app-notificaciones-revisor',
  standalone: true,
  templateUrl: './notificaciones-revisor.component.html',
  styleUrls: ['./notificaciones-revisor.component.css'],
})
export class NotificacionesRevisorComponent implements OnInit {
  private readonly revisoresService = inject(RevisoresService);
  private readonly router = inject(Router);

  notificaciones: Array<NotificacionRevisorDto & { leida: boolean }> = NOTIFICACIONES_REVISOR_MOCK.map((item) => ({ ...item, leida: false }));
  filtro: 'todas' | 'no-leidas' = 'todas';

  async ngOnInit(): Promise<void> {
    try {
      const idsLeidos = this.obtenerIdsLeidos();
      const data = await firstValueFrom(this.revisoresService.getNotificacionesRevisor());
      this.notificaciones = data.map((item) => ({
        ...item,
        leida: idsLeidos.has(item.id),
      }));
    } catch {
      this.notificaciones = NOTIFICACIONES_REVISOR_MOCK.map((item) => ({ ...item, leida: false }));
    }
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
      item.id === id ? { ...item, leida: true } : item,
    );
    this.guardarIdsLeidos(new Set(this.notificaciones.filter((item) => item.leida).map((item) => item.id)));
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
