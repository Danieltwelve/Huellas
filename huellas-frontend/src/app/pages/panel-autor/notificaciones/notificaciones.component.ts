import { Component, OnInit, inject } from '@angular/core';
import {
  ArticulosAutorService,
  NotificacionAutorBackend,
} from '../../../core/articulos/articulos-autor.service';

interface Notificacion {
  id: string;
  articuloId: number;
  codigoArticulo: string;
  tituloArticulo: string;
  titulo: string;
  detalle: string;
  fecha: string;
  fechaTexto: string;
  tipo: 'accion' | 'informacion' | 'exito';
  leida: boolean;
}

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.css']
})
export class NotificacionesComponent implements OnInit {
  private readonly articulosAutorService = inject(ArticulosAutorService);

  filtro: 'todas' | 'no-leidas' = 'todas';
  loading = true;
  error: string | null = null;

  notificaciones: Notificacion[] = [];

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  get visibles(): Notificacion[] {
    if (this.filtro === 'no-leidas') {
      return this.notificaciones.filter((n) => !n.leida);
    }
    return this.notificaciones;
  }

  private get storageKey(): string {
    return 'huellas.autor.notificaciones.leidas';
  }

  private cargarNotificaciones(): void {
    this.loading = true;
    this.error = null;

    this.articulosAutorService.getMisNotificaciones().subscribe({
      next: (data) => {
        const idsLeidas = this.obtenerIdsLeidas();
        this.notificaciones = data.map((n: NotificacionAutorBackend) => ({
          id: n.id,
          articuloId: n.articuloId,
          codigoArticulo: n.codigoArticulo,
          tituloArticulo: n.tituloArticulo,
          titulo: n.titulo,
          detalle: n.detalle,
          fecha: n.fecha,
          fechaTexto: this.formatearRelativo(n.fecha),
          tipo: n.tipo,
          leida: idsLeidas.has(n.id),
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando notificaciones:', err);
        this.error = 'No fue posible cargar tus notificaciones.';
        this.loading = false;
      },
    });
  }

  setFiltro(value: 'todas' | 'no-leidas') {
    this.filtro = value;
  }

  marcarTodasLeidas() {
    this.notificaciones = this.notificaciones.map((n) => ({ ...n, leida: true }));
    this.guardarIdsLeidas(new Set(this.notificaciones.map((n) => n.id)));
  }

  marcarLeida(notificacion: Notificacion): void {
    if (notificacion.leida) {
      return;
    }

    notificacion.leida = true;
    const idsLeidas = this.obtenerIdsLeidas();
    idsLeidas.add(notificacion.id);
    this.guardarIdsLeidas(idsLeidas);
  }

  private obtenerIdsLeidas(): Set<string> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return new Set<string>();
      }

      const parsed = JSON.parse(raw) as string[];
      return new Set<string>(parsed);
    } catch {
      return new Set<string>();
    }
  }

  private guardarIdsLeidas(ids: Set<string>): void {
    localStorage.setItem(this.storageKey, JSON.stringify(Array.from(ids)));
  }

  private formatearRelativo(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) {
      return 'Sin fecha';
    }

    const ahora = Date.now();
    const diffMs = Math.max(0, ahora - fecha.getTime());
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMin < 1) {
      return 'Hace unos segundos';
    }

    if (diffMin < 60) {
      return `Hace ${diffMin} min`;
    }

    if (diffHoras < 24) {
      return `Hace ${diffHoras} h`;
    }

    if (diffDias === 1) {
      return 'Ayer';
    }

    if (diffDias < 7) {
      return `Hace ${diffDias} dias`;
    }

    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
