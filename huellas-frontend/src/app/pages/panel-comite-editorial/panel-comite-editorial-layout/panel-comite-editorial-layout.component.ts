import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ArticulosService } from '../../../core/articulos/articulos.service';
import { NotificationDropdownComponent, NotificationDropdownItem } from '../../../core/components/notification-dropdown/notification-dropdown.component';
import { Subject, forkJoin, interval, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-panel-comite-editorial-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NotificationDropdownComponent],
  templateUrl: './panel-comite-editorial-layout.component.html',
  styleUrls: ['./panel-comite-editorial-layout.component.css'],
})
export class PanelComiteEditorialLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly articulosService = inject(ArticulosService);
  private destroy$ = new Subject<void>();

  collapsed = false;
  totalNotificaciones = 0;
  mostrarAlertaNotificaciones = false;
  mensajeAlertaNotificaciones = '';
  notificationLoading = false;
  notificationError: string | null = null;
  notifications: NotificationDropdownItem[] = [];

  ngOnInit(): void {
    this.cargarNotificaciones();

    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cargarNotificaciones(false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarNotificaciones(esPrimeraCarga = true): void {
    this.notificationLoading = true;
    this.notificationError = null;

    forkJoin({
      articulos: this.articulosService.getArticulosComiteAsignados().pipe(
        catchError(() => of([])),
      ),
      vencimientos: this.articulosService.getNotificacionesVencimientoComite().pipe(
        catchError(() => of([])),
      ),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ articulos, vencimientos }) => {
          const idsActuales = articulos.map((a) => a.id);
          const key = 'comite-notificaciones-vistos';
          const idsPrevios = this.getIdsGuardados(key);
          const nuevosAsignados = idsPrevios.length
            ? idsActuales.filter((id) => !idsPrevios.includes(id)).length
            : 0;

          localStorage.setItem(key, JSON.stringify(idsActuales));

          const items = [
            ...this.construirNotificacionesRecordatorio(vencimientos),
            ...this.construirNotificacionesNuevosArticulos(articulos),
            ...this.construirNotificacionesSinRevisar(articulos),
          ];
          const idsLeidos = this.obtenerIdsLeidos();

          this.notifications = items
            .map((item) => ({ ...item, leida: idsLeidos.has(item.id) }))
            .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

          this.totalNotificaciones = this.notifications.filter((item) => !item.leida).length;

          if (!esPrimeraCarga && this.totalNotificaciones > 0) {
            this.mostrarAlertaNotificaciones = true;
            this.mensajeAlertaNotificaciones =
              nuevosAsignados > 0
                ? `Se asignaron ${nuevosAsignados} artículo(s) nuevo(s).`
                : 'Tienes recordatorios de revisión pendientes.';
          }

          this.notificationLoading = false;
        },
        error: () => {
          this.notifications = [];
          this.totalNotificaciones = 0;
          this.notificationError = 'No se pudieron cargar las notificaciones.';
          this.notificationLoading = false;
        },
      });
  }

  private getIdsGuardados(key: string): number[] {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'number') : [];
    } catch {
      return [];
    }
  }

  private obtenerIdsLeidos(): Set<string> {
    try {
      const raw = localStorage.getItem('comite-notificaciones-leidas');
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
    localStorage.setItem('comite-notificaciones-leidas', JSON.stringify(Array.from(ids)));
  }

  private construirNotificacionesNuevosArticulos(articulos: any[]): NotificationDropdownItem[] {
    const idsPrevios = this.getIdsGuardados('comite-notificaciones-vistos');

    if (!idsPrevios.length) {
      return [];
    }

    return articulos
      .filter((articulo) => !idsPrevios.includes(articulo.id))
      .map((articulo) => ({
        id: `nuevo-${articulo.id}`,
        articuloId: articulo.id,
        codigoArticulo: articulo.codigo,
        titulo: 'Nuevo artículo asignado',
        detalle: `Se te asignó ${articulo.codigo}: ${articulo.titulo}`,
        fecha: new Date(),
        enlace: `/panel-comite-editorial/articulos/${articulo.id}`,
        leida: false,
      }));
  }

  private construirNotificacionesSinRevisar(articulos: any[]): NotificationDropdownItem[] {
    return articulos
      .filter(
        (articulo) =>
          articulo.estado_evaluacion === 'pendiente' &&
          articulo.dias_restantes !== null &&
          typeof articulo.dias_restantes === 'number' &&
          articulo.dias_restantes > 5,
      )
      .slice(0, 5)
      .map((articulo) => ({
        id: `sin-revisar-${articulo.id}`,
        articuloId: articulo.id,
        codigoArticulo: articulo.codigo,
        titulo: 'Artículo pendiente de revisión',
        detalle: `${articulo.codigo}: ${articulo.titulo} - Vence en ${articulo.dias_restantes} días`,
        fecha: new Date(),
        enlace: `/panel-comite-editorial/articulos/${articulo.id}`,
        leida: false,
      }));
  }

  private construirNotificacionesRecordatorio(items: any[]): NotificationDropdownItem[] {
    return items.map((item) => ({
      id: `rev-${item.articuloId}-${item.tipo}`,
      articuloId: item.articuloId,
      codigoArticulo: item.codigo,
      titulo: item.tipo === 'vencido' ? 'Revisión vencida' : 'Recordatorio de revisión',
      detalle: item.mensaje,
      fecha: new Date(),
      enlace: `/panel-comite-editorial/articulos/${item.articuloId}`,
      leida: false,
    }));
  }

  navigateToNotification(notification: NotificationDropdownItem): void {
    this.marcarNotificacionLeida(notification.id);
    this.router.navigateByUrl(notification.enlace);
  }

  goToNotificationCenter(): void {
    this.router.navigate(['/panel-comite-editorial/notificaciones']);
  }

  private marcarNotificacionLeida(id: string): void {
    const ids = this.obtenerIdsLeidos();
    ids.add(id);
    this.guardarIdsLeidos(ids);
    this.notifications = this.notifications.map((item) =>
      item.id === id ? { ...item, leida: true } : item,
    );
    this.totalNotificaciones = this.notifications.filter((item) => !item.leida).length;
    window.dispatchEvent(new CustomEvent('huellas-notifications-updated'));
  }

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
