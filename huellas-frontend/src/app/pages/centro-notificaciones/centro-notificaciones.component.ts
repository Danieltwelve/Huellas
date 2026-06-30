import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { RevisoresService } from '../../core/revisores/revisores.service';
import { ArticulosAutorService } from '../../core/articulos/articulos-autor.service';
import { ArticulosService } from '../../core/articulos/articulos.service';

interface NotificationUI {
  id: string;
  articuloId?: number;
  codigoArticulo?: string;
  titulo: string;
  detalle: string;
  fecha: Date;
  enlace: string;
  tipo?: string; // 'plazo' | 'mensaje' | 'asignacion' | 'exito' | 'nuevo-articulo' etc.
  leida: boolean;
}

@Component({
  selector: 'app-centro-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './centro-notificaciones.component.html',
  styleUrls: ['./centro-notificaciones.component.css'],
})
export class CentroNotificacionesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly revisoresService = inject(RevisoresService);
  private readonly articulosAutorService = inject(ArticulosAutorService);
  private readonly articulosService = inject(ArticulosService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  notificaciones: NotificationUI[] = [];
  filtro: 'todas' | 'no-leidas' = 'todas';
  loading = false;
  error: string | null = null;
  userRole: string | null = null;

  ngOnInit(): void {
    this.authService.claims$.subscribe((claims) => {
      const roles = claims?.roles || [];
      if (roles.includes('revisor')) {
        this.userRole = 'revisor';
      } else if (roles.includes('autor')) {
        this.userRole = 'autor';
      } else if (roles.includes('comite-editorial')) {
        this.userRole = 'comite-editorial';
      }
      this.cargarNotificaciones();
    });

    const refreshHandler = () => this.cargarNotificaciones();
    window.addEventListener('huellas-notifications-updated', refreshHandler);
    window.addEventListener('storage', refreshHandler);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('huellas-notifications-updated', refreshHandler);
      window.removeEventListener('storage', refreshHandler);
    });
  }

  get visibles(): NotificationUI[] {
    if (this.filtro === 'no-leidas') {
      return this.notificaciones.filter((n) => !n.leida);
    }
    return this.notificaciones;
  }

  setFiltro(val: 'todas' | 'no-leidas'): void {
    this.filtro = val;
  }

  cargarNotificaciones(): void {
    if (!this.userRole) return;
    this.loading = true;
    this.error = null;

    if (this.userRole === 'revisor') {
      this.cargarRevisorNotificaciones();
    } else if (this.userRole === 'autor') {
      this.cargarAutorNotificaciones();
    } else if (this.userRole === 'comite-editorial') {
      this.cargarComiteNotificaciones();
    } else {
      this.cargarAdminNotificaciones();
    }
  }

  private cargarRevisorNotificaciones(): void {
    this.revisoresService.getNotificacionesRevisor().subscribe({
      next: (data) => {
        const idsLeidos = this.obtenerIdsLeidos();
        this.notificaciones = data
          .map((item) => ({
            id: item.id,
            articuloId: item.articuloId,
            codigoArticulo: item.codigoArticulo || this.extractCode(item.detalle),
            titulo: item.titulo,
            detalle: item.detalle,
            fecha: new Date(item.fecha),
            enlace: item.enlace || `/panel-revisor/realizar-revision?articuloId=${item.articuloId}`,
            tipo: item.id.startsWith('ASIG') ? 'asignacion' : 'mensaje',
            leida: idsLeidos.has(item.id),
          }))
          .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las notificaciones.';
        this.loading = false;
      },
    });
  }

  private cargarAutorNotificaciones(): void {
    this.articulosAutorService.getMisNotificaciones().subscribe({
      next: (data) => {
        const idsLeidos = this.obtenerIdsLeidos();
        this.notificaciones = data
          .map((item) => {
            const texto = `${item.titulo ?? ''} ${item.detalle ?? ''}`.toLowerCase();
            const esCertificado = /certific/i.test(texto);
            return {
              id: item.id,
              articuloId: item.articuloId,
              codigoArticulo: item.codigoArticulo,
              titulo: item.titulo,
              detalle: item.detalle,
              fecha: new Date(item.fecha),
              enlace: esCertificado
                ? '/panel-autor/certificados'
                : `/panel-autor/timeline?articuloId=${item.articuloId}`,
              tipo: item.tipo,
              leida: idsLeidos.has(item.id),
            };
          })
          .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las notificaciones.';
        this.loading = false;
      },
    });
  }

  private cargarComiteNotificaciones(): void {
    forkJoin({
      articulos: this.articulosService.getArticulosComiteAsignados().pipe(catchError(() => of([]))),
      vencimientos: this.articulosService
        .getNotificacionesVencimientoComite()
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ articulos, vencimientos }) => {
        const idsLeidos = this.obtenerIdsLeidos();
        const list: NotificationUI[] = [];

        // Nuevos
        const key = 'comite-notificaciones-vistos';
        const rawVistos = localStorage.getItem(key);
        const vistos = rawVistos ? (JSON.parse(rawVistos) as number[]) : [];
        const nuevos = articulos.filter((a) => !vistos.includes(a.id));

        nuevos.forEach((articulo) => {
          list.push({
            id: `nuevo-${articulo.id}`,
            articuloId: articulo.id,
            codigoArticulo: articulo.codigo,
            titulo: 'Nuevo artículo asignado',
            detalle: `Se te asignó ${articulo.codigo}: ${articulo.titulo}`,
            fecha: new Date(),
            enlace: `/panel-comite-editorial/articulos/${articulo.id}`,
            tipo: 'nuevo-articulo',
            leida: idsLeidos.has(`nuevo-${articulo.id}`),
          });
        });

        // Recordatorios vencimiento
        vencimientos.forEach((v) => {
          const id = `rev-${v.articuloId}-${v.tipo}`;
          list.push({
            id: id,
            articuloId: v.articuloId,
            codigoArticulo: v.codigo,
            titulo: v.tipo === 'vencido' ? 'Revisión vencida' : 'Recordatorio de revisión',
            detalle: v.mensaje,
            fecha: new Date(),
            enlace: `/panel-comite-editorial/articulos/${v.articuloId}`,
            tipo: v.tipo, // 'vencido' | 'proximo-vencer'
            leida: idsLeidos.has(id),
          });
        });

        // Sin revisar
        articulos
          .filter(
            (a) =>
              a.estado_evaluacion === 'pendiente' &&
              typeof a.dias_restantes === 'number' &&
              a.dias_restantes > 5,
          )
          .forEach((articulo) => {
            const id = `sin-revisar-${articulo.id}`;
            list.push({
              id: id,
              articuloId: articulo.id,
              codigoArticulo: articulo.codigo,
              titulo: 'Artículo pendiente de revisión',
              detalle: `${articulo.codigo}: ${articulo.titulo} - Vence en ${articulo.dias_restantes} días`,
              fecha: new Date(),
              enlace: `/panel-comite-editorial/articulos/${articulo.id}`,
              tipo: 'sin-revisar',
              leida: idsLeidos.has(id),
            });
          });

        this.notificaciones = list.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las notificaciones.';
        this.loading = false;
      },
    });
  }

  private cargarAdminNotificaciones(): void {
    this.loading = true;
    this.error = null;

    this.articulosService.getNotificacionesEditorial().subscribe({
      next: (data) => {
        const idsLeidos = this.obtenerIdsLeidos();
        this.notificaciones = data
          .map((item) => ({
            id: item.id,
            articuloId: item.articuloId,
            codigoArticulo: item.codigoArticulo,
            titulo: item.titulo,
            detalle: item.detalle,
            fecha: new Date(item.fecha),
            enlace: item.enlace || `/flujo-trabajo-articulo/${item.articuloId}`,
            tipo: item.tipo || 'mensaje',
            leida: idsLeidos.has(item.id),
          }))
          .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        this.loading = false;
      },
      error: () => {
        this.notificaciones = [];
        this.error = 'No se pudieron cargar las notificaciones.';
        this.loading = false;
      },
    });
  }

  marcarLeida(id: string): void {
    this.notificaciones = this.notificaciones.map((n) => (n.id === id ? { ...n, leida: true } : n));
    const ids = this.obtenerIdsLeidos();
    ids.add(id);
    this.guardarIdsLeidos(ids);
    window.dispatchEvent(new CustomEvent('huellas-notifications-updated'));
  }

  marcarTodasComoLeidas(): void {
    this.notificaciones = this.notificaciones.map((n) => ({ ...n, leida: true }));
    const ids = new Set(this.notificaciones.map((n) => n.id));
    this.guardarIdsLeidos(ids);
    window.dispatchEvent(new CustomEvent('huellas-notifications-updated'));
  }

  abrirNotificacion(item: NotificationUI): void {
    this.marcarLeida(item.id);
    if (item.enlace) {
      this.router.navigateByUrl(item.enlace);
    }
  }

  getTiempoTranscurrido(fecha: Date): string {
    const diffMs = Date.now() - fecha.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHor = Math.floor(diffMin / 60);
    const diffDia = Math.floor(diffHor / 24);

    if (diffSec < 60) return 'Hace unos segundos';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHor < 24) return `Hace ${diffHor} h`;
    return `Hace ${diffDia} d`;
  }

  private extractCode(text: string): string | undefined {
    const match = text.match(/(REV-\d+-\d+|FERCH-\d+)/i);
    return match ? match[1] : undefined;
  }

  private get storageKey(): string {
    if (this.userRole === 'revisor') return 'revisor-notificaciones-leidas';
    if (this.userRole === 'autor') return 'huellas.autor.notificaciones.leidas';
    if (this.userRole === 'comite-editorial') return 'comite-notificaciones-leidas';
    return 'huellas.navbar.notificaciones.leidas.admin';
  }

  private obtenerIdsLeidos(): Set<string> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw) as string[];
      return new Set(parsed.filter((id) => typeof id === 'string'));
    } catch {
      return new Set<string>();
    }
  }

  private guardarIdsLeidos(ids: Set<string>): void {
    localStorage.setItem(this.storageKey, JSON.stringify(Array.from(ids)));
  }
}
