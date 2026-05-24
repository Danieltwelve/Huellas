import { Component, DestroyRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccessClaims, AuthService } from '../../../core/auth/auth.service';
import { CommonModule } from '@angular/common';
import { ArticulosAutorService } from '../../../core/articulos/articulos-autor.service';
import { NotificationDropdownComponent } from '../../../core/components/notification-dropdown/notification-dropdown.component';

@Component({
  selector: 'app-panel-autor-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, NotificationDropdownComponent],
  templateUrl: './panel-autor-layout.html',
  styleUrls: ['./panel-autor-layout.css']
})
export class PanelAutorLayoutComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private authService = inject(AuthService);
  private router = inject(Router);
  private articulosAutorService = inject(ArticulosAutorService);

  @ViewChild(NotificationDropdownComponent) notificationDropdown?: NotificationDropdownComponent;

  collapsed = false;
  userMenuOpen = false;
  notificationCount = 0;
  notificationMenuOpen = false;
  notificationLoading = false;
  notificationError: string | null = null;
  notifications: Array<any> = [];

  ngOnInit(): void {
    this.cargarNotificaciones();

    const refrescar = () => this.cargarNotificaciones();
    window.addEventListener('huellas-notifications-updated', refrescar);
    window.addEventListener('storage', refrescar);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('huellas-notifications-updated', refrescar);
      window.removeEventListener('storage', refrescar);
    });
  }

  private cargarNotificaciones(): void {
    this.notificationLoading = true;
    this.notificationError = null;
    this.articulosAutorService.getMisNotificaciones().subscribe({
      next: (notificaciones) => {
        const idsLeidas = this.obtenerIdsLeidas();
        this.notifications = notificaciones
          .map((n: any) => {
            const texto = `${n.titulo ?? ''} ${n.detalle ?? ''}`.toLowerCase();
            const esCertificado = /certific/i.test(texto);

            return {
              id: n.id,
              articuloId: n.articuloId,
              codigoArticulo: n.codigoArticulo,
              titulo: n.titulo,
              detalle: n.detalle,
              fecha: n.fecha,
              enlace: esCertificado ? '/panel-autor/certificados' : `/panel-autor/timeline?articuloId=${n.articuloId}`,
              leida: idsLeidas.has(n.id),
            };
          })
          .sort((a, b) => (new Date(b.fecha)).getTime() - (new Date(a.fecha)).getTime());

        this.notificationCount = this.notifications.filter((item) => !item.leida).length;
        this.notificationLoading = false;
      },
      error: () => {
        this.notifications = [];
        this.notificationError = 'No se pudieron cargar tus notificaciones.';
        this.notificationCount = 0;
        this.notificationLoading = false;
      },
    });
  }

  toggleNotifications(): void {
    this.notificationMenuOpen = !this.notificationMenuOpen;
  }

  navigateToNotification(notification: any): void {
    if (!notification) return;
    this.marcarNotificacionLeida(notification.id);
    this.notificationMenuOpen = false;

    const enlace = typeof notification.enlace === 'string' ? notification.enlace.trim() : '';
    if (enlace.startsWith('/')) {
      this.router.navigateByUrl(enlace).catch(() => this.router.navigate(['/panel-autor/notificaciones']));
      return;
    }

    this.router.navigate(['/panel-autor/notificaciones']);
  }

  private marcarNotificacionLeida(id: string): void {
    const ids = this.obtenerIdsLeidas();
    ids.add(id);
    try {
      localStorage.setItem('huellas.autor.notificaciones.leidas', JSON.stringify(Array.from(ids)));
    } catch {}
    this.notifications = this.notifications.map((n) => n.id === id ? { ...n, leida: true } : n);
    window.dispatchEvent(new CustomEvent('huellas-notifications-updated'));
    this.notificationCount = this.notifications.filter((item) => !item.leida).length;
  }

  private obtenerIdsLeidas(): Set<string> {
    try {
      const raw = localStorage.getItem('huellas.autor.notificaciones.leidas');
      if (!raw) {
        return new Set<string>();
      }

      const parsed = JSON.parse(raw) as string[];
      return new Set(parsed.filter((id) => typeof id === 'string'));
    } catch {
      return new Set<string>();
    }
  }

  claims$ = this.authService.claims$;
  user$ = this.authService.user$;

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
  }

  toggleUserMenu(): void {
    this.notificationDropdown?.close();
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

  @HostListener('window:resize')
  onResize(): void {}

  async logout(): Promise<void> {
    try {
      this.notificationDropdown?.close();
      this.userMenuOpen = false;
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (e) {
      console.error(e);
    }
  }

  goToNotificationCenter(): void {
    this.notificationDropdown?.close();
    this.router.navigate(['/panel-autor/notificaciones']);
  }

}
