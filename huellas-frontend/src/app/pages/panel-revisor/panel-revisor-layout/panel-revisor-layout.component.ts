import { Component, OnInit, inject, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, AccessClaims } from '../../../core/auth/auth.service';
import { NotificationDropdownComponent, NotificationDropdownItem } from '../../../core/components/notification-dropdown/notification-dropdown.component';
import { RevisoresService } from '../../../core/revisores/revisores.service';
import { NOTIFICACIONES_REVISOR_MOCK } from '../panel-revisor.data';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-panel-revisor-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, NotificationDropdownComponent],
  templateUrl: './panel-revisor-layout.component.html',
  styleUrls: ['./panel-revisor-layout.component.css'],
})
export class PanelRevisorLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly revisoresService = inject(RevisoresService);

  collapsed = false;
  mobileSidebarOpen = false;
  userMenuOpen = false;
  notificationLoading = false;
  notificationError: string | null = null;
  notifications: NotificationDropdownItem[] = this.buildNotifications();
  claims$ = this.authService.claims$;

  ngOnInit(): void {
    const idsLeidos = this.obtenerIdsLeidos();
    this.revisoresService.getNotificacionesRevisor().subscribe({
      next: (data) => {
        this.notifications = data
          .map((item) => ({
            id: item.id,
            articuloId: item.articuloId ?? 0,
            codigoArticulo: item.codigoArticulo ?? 'REV',
            titulo: item.titulo,
            detalle: item.detalle,
            fecha: new Date(item.fecha),
            enlace: item.enlace ?? '/panel-revisor/notificaciones',
            leida: idsLeidos.has(item.id),
          }))
          .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        this.notificationError = null;
      },
      error: (error) => {
        this.notifications = this.buildNotifications();
        this.notificationError = 'No se pudieron cargar las notificaciones del revisor.';
        console.error('Error cargando notificaciones del revisor', error);
      },
    });
  }

  toggleSidebar(): void {
    if (window.matchMedia('(max-width: 960px)').matches) {
      this.mobileSidebarOpen = !this.mobileSidebarOpen;
      return;
    }

    this.collapsed = !this.collapsed;
  }

  navigateToNotification(notification: NotificationDropdownItem): void {
    this.marcarNotificacionLeida(notification.id);
    this.mobileSidebarOpen = false;
    this.router.navigateByUrl(notification.enlace);
  }

  goToNotificationCenter(): void {
    this.mobileSidebarOpen = false;
    this.router.navigate(['/panel-revisor/notificaciones']);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
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
    this.userMenuOpen = false;
    await this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  getRoleTitle(claims: AccessClaims | null | undefined): string {
    const role = claims?.roles?.[0];
    if (!role || typeof role !== 'string') return 'Rol Sin Asignar';
    return `Rol ${role.replace(/[_-]+/g, ' ').trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-actions')) {
      this.userMenuOpen = false;
    }
  }
}
