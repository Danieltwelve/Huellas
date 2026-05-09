import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationDropdownComponent, NotificationDropdownItem } from '../../../core/components/notification-dropdown/notification-dropdown.component';
import { NOTIFICACIONES_REVISOR_MOCK } from '../panel-revisor.data';

@Component({
  selector: 'app-panel-revisor-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NotificationDropdownComponent],
  templateUrl: './panel-revisor-layout.component.html',
  styleUrls: ['./panel-revisor-layout.component.css'],
})
export class PanelRevisorLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  collapsed = false;
  notificationLoading = false;
  notificationError: string | null = null;
  notifications: NotificationDropdownItem[] = this.buildNotifications();

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
  }

  navigateToNotification(notification: NotificationDropdownItem): void {
    this.marcarNotificacionLeida(notification.id);
    this.router.navigateByUrl(notification.enlace);
  }

  goToNotificationCenter(): void {
    this.router.navigate(['/panel-revisor/notificaciones']);
  }

  private buildNotifications(): NotificationDropdownItem[] {
    const idsLeidos = this.obtenerIdsLeidos();

    return NOTIFICACIONES_REVISOR_MOCK
      .map((item) => ({
        id: item.id,
        articuloId: 0,
        codigoArticulo: 'REV',
        titulo: item.titulo,
        detalle: item.detalle,
        fecha: new Date(item.fecha),
        enlace: '/panel-revisor/notificaciones',
        leida: idsLeidos.has(item.id),
      }))
      .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
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

  private marcarNotificacionLeida(id: string): void {
    const ids = this.obtenerIdsLeidos();
    ids.add(id);
    this.guardarIdsLeidos(ids);
    this.notifications = this.notifications.map((item) =>
      item.id === id ? { ...item, leida: true } : item,
    );
    window.dispatchEvent(new CustomEvent('huellas-notifications-updated'));
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
