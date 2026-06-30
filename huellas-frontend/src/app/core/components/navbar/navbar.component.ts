import { Component, HostListener, Input, OnDestroy, OnInit, ViewChild, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { NotificationDropdownComponent } from '../notification-dropdown/notification-dropdown.component';
import { combineLatest, interval, Subject } from 'rxjs';
import { filter, map, startWith, takeUntil } from 'rxjs/operators';
import { AccessClaims, AuthService } from '../../auth/auth.service';
import {
  ArticuloResumenBackend,
  ArticulosService,
} from '../../articulos/articulos.service';
import {
  ArticulosAutorService,
  NotificacionAutorBackend,
} from '../../articulos/articulos-autor.service';
import { NOTIFICACIONES_REVISOR_MOCK } from '../../../pages/panel-revisor/panel-revisor.data';
import { RevisoresService } from '../../revisores/revisores.service';

interface NavbarNotificacion {
  id: string;
  articuloId: number;
  codigoArticulo: string;
  titulo: string;
  detalle: string;
  fecha: Date;
  enlace: string;
}

interface NavbarNotificacionVista extends NavbarNotificacion {
  leida: boolean;
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationDropdownComponent],
})
export class NavbarComponent implements OnInit {
  @Input() compactMode = false;
  @Input() showSidebar = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  onToggleSidebarClick(): void {
    this.toggleSidebar.emit();
  }

  private authService = inject(AuthService);
  private router = inject(Router);
  private articulosService = inject(ArticulosService);
  private articulosAutorService = inject(ArticulosAutorService);
  private revisoresService = inject(RevisoresService);
  private destroy$ = new Subject<void>();
  @ViewChild(NotificationDropdownComponent) notificationDropdown?: NotificationDropdownComponent;
  menuOpen = false;
  openDropdown: string | null = null;
  userMenuOpen = false;
  notificationMenuOpen = false;
  notificationLoading = false;
  notificationError: string | null = null;
  notifications: NavbarNotificacionVista[] = [];
  private currentClaims: AccessClaims | null = null;

  claims$ = this.authService.claims$;
  user$ = this.authService.user$;
  canAccessPanel$ = combineLatest([this.user$, this.claims$]).pipe(
    map(([user, claims]) => {
      if (!user) return false;

      const roles = Array.isArray(claims?.roles) ? claims.roles : [];

      return Boolean(
        claims?.canManageUsers ||
          claims?.canSubmitEnvios ||
          claims?.canViewArchivos ||
          roles.length > 0,
      );
    }),
  );
  isAuthorSection$ = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    startWith(null),
    map(() => this.router.url.startsWith('/panel-autor')),
  );
  isPrivateSection$ = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    startWith(null),
    map(() => {
      const url = this.router.url;
      return (
        url.startsWith('/panel-autor') ||
        url.startsWith('/panel-revisor') ||
        url.startsWith('/gestion-usuarios') ||
        url.startsWith('/estadisticas') ||
        url.startsWith('/archivos') ||
        url.startsWith('/envios')
      );
    }),
  );

  ngOnInit(): void {
    // Cerrar menú cuando se navega
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.closeMenu();
    });

    combineLatest([this.user$, this.claims$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([user, claims]) => {
        this.currentClaims = claims;

        if (!user) {
          this.notifications = [];
          this.notificationError = null;
          this.notificationLoading = false;
          return;
        }

        this.cargarNotificaciones();
      });

    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cargarNotificaciones());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* CONTROL SCROLL */

  hideNavbar = false;
  scrolled = false;
  lastScrollPosition = 0;

  @HostListener('window:scroll', [])
  onWindowScroll() {

    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

    /* fondo al hacer scroll */

    this.scrolled = currentScroll > 40;

    /* ocultar navbar */

    if (currentScroll > this.lastScrollPosition && currentScroll > 80) {
      this.hideNavbar = true;
    } else {
      this.hideNavbar = false;
    }

    this.lastScrollPosition = currentScroll <= 0 ? 0 : currentScroll;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const insideNotification = !!target.closest('.notification-wrapper');
    const insideUserActions = !!target.closest('.user-actions');

    if (!insideNotification) {
      this.notificationMenuOpen = false;
    }

    if (!insideUserActions) {
      this.userMenuOpen = false;
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
    this.openDropdown = null;
    this.userMenuOpen = false;
    this.notificationMenuOpen = false;
  }

  toggleDropdown(dropdown: string) {
    this.openDropdown = this.openDropdown === dropdown ? null : dropdown;
  }

  toggleUserMenu() {    this.notificationDropdown?.close();    this.notificationMenuOpen = false;
    this.userMenuOpen = !this.userMenuOpen;
  }

  toggleNotifications(): void {
    this.userMenuOpen = false;
    this.notificationMenuOpen = !this.notificationMenuOpen;
  }

  goToNotificationCenter(): void {
    this.notificationMenuOpen = false;

    if (this.hasRole('autor')) {
      this.router.navigate(['/panel-autor/notificaciones']);
      return;
    }

    if (this.hasRole('revisor')) {
      this.router.navigate(['/panel-revisor/notificaciones']);
      return;
    }

    if (this.hasRole('comite-editorial')) {
      this.router.navigate(['/panel-comite-editorial/notificaciones']);
      return;
    }

    this.router.navigate(['/articulos']);
  }

  navigateToNotification(notification: NavbarNotificacion): void {
    this.marcarNotificacionLeida(notification.id);
    this.notificationMenuOpen = false;

    // Ensure claims are available (up to a short timeout) to avoid guards rejecting navigation
    this.waitForClaims(1500)
      .then(() => {
        // Prefer using the provided enlace when available (it may include query params)
        const enlace = notification.enlace?.trim();
        if (enlace && enlace.startsWith('/')) {
          this.router
            .navigateByUrl(enlace)
            .then((ok) => {
              if (!ok) {
                this.navegacionFallback(notification);
              }
            })
            .catch(() => this.navegacionFallback(notification));
          return;
        }

        this.navegacionFallback(notification);
      })
      .catch(() => {
        // If waiting for claims times out, still try fallback navigation
        this.navegacionFallback(notification);
      });
  }

  private waitForClaims(timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const sub = this.authService.claims$.subscribe((claims) => {
        if (claims && Object.keys(claims).length > 0) {
          sub.unsubscribe();
          resolve();
        }
      });

      // Fallback: resolve after timeout to avoid blocking forever
      setTimeout(() => {
        try {
          sub.unsubscribe();
        } catch {}
        resolve();
      }, timeoutMs);
    });
  }

  private navegacionFallback(notification: NavbarNotificacion): void {
    const destino = this.obtenerDestinoNotificacion(notification);
    if (!destino) {
      this.goToNotificationCenter();
      return;
    }

    this.router
      .navigate(destino.commands, destino.extras)
      .then((ok) => {
        if (!ok) {
          this.goToNotificationCenter();
        }
      })
      .catch(() => this.goToNotificationCenter());
  }

  get notificationCount(): number {
    return this.notifications.filter((notification) => !notification.leida).length;
  }

  private cargarNotificaciones(): void {
    const claims = this.currentClaims;

    if (!claims) {
      return;
    }

    if (this.authService.hasAnyRole(['autor'])) {
      this.cargarNotificacionesAutor();
      return;
    }

    if (this.authService.hasAnyRole(['revisor'])) {
      this.cargarNotificacionesRevisor();
      return;
    }

    if (
      this.authService.hasAnyRole(['admin', 'comite-editorial']) ||
      claims.canManageArticulos ||
      claims.canManageFlujoEditorial
    ) {
      this.cargarNotificacionesEditoriales();
      return;
    }

    this.notifications = [];
    this.notificationError = null;
  }

  private cargarNotificacionesRevisor(): void {
    this.notificationLoading = true;
    this.notificationError = null;

    this.revisoresService.getNotificacionesRevisor().subscribe({
      next: (data) => {
        const idsLeidos = this.obtenerIdsLeidos();

        this.notifications = data
          .map((item) => ({
            id: item.id,
            articuloId: item.articuloId ?? 0,
            codigoArticulo: item.codigoArticulo ?? 'REV',
            titulo: item.titulo,
            detalle: item.detalle,
            fecha: new Date(item.fecha),
            enlace: item.enlace || '/panel-revisor/notificaciones',
            leida: idsLeidos.has(item.id),
          }))
          .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        this.notificationLoading = false;
      },
      error: () => {
        this.notifications = [];
        this.notificationError = 'No se pudieron cargar tus notificaciones.';
        this.notificationLoading = false;
      },
    });
  }

  private cargarNotificacionesAutor(): void {
    this.notificationLoading = true;
    this.notificationError = null;

    this.articulosAutorService.getMisNotificaciones().subscribe({
      next: (data) => {
        const idsLeidos = this.obtenerIdsLeidos();

        this.notifications = data
          .map((item) => this.mapearNotificacionAutor(item))
          .map((item) => ({
            ...item,
            leida: idsLeidos.has(item.id),
          }))
          .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        this.notificationLoading = false;
      },
      error: () => {
        this.notifications = [];
        this.notificationError = 'No se pudieron cargar tus notificaciones.';
        this.notificationLoading = false;
      },
    });
  }

  private cargarNotificacionesEditoriales(): void {
    this.notificationLoading = true;
    this.notificationError = null;

    this.articulosService.getNotificacionesEditorial().subscribe({
      next: (data) => {
        const idsLeidos = this.obtenerIdsLeidos();

        this.notifications = data
          .map((item) => ({
            id: item.id,
            articuloId: item.articuloId,
            codigoArticulo: item.codigoArticulo,
            titulo: item.titulo,
            detalle: item.detalle,
            fecha: new Date(item.fecha),
            enlace: item.enlace || this.obtenerEnlaceArticulo(item.articuloId),
            leida: idsLeidos.has(item.id),
          }))
          .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        this.notificationLoading = false;
      },
      error: () => {
        this.notifications = [];
        this.notificationError = 'No se pudieron cargar las notificaciones.';
        this.notificationLoading = false;
      },
    });
  }

  private mapearNotificacionAutor(item: NotificacionAutorBackend): NavbarNotificacion {
    const texto = `${item.titulo ?? ''} ${item.detalle ?? ''}`.toLowerCase();
    const esCertificado = /certific/i.test(texto);

    return {
      id: item.id,
      articuloId: item.articuloId,
      codigoArticulo: item.codigoArticulo,
      titulo: item.titulo,
      detalle: item.detalle,
      fecha: new Date(item.fecha),
      enlace: esCertificado ? '/panel-autor/certificados' : this.obtenerEnlaceArticulo(item.articuloId),
    };
  }

  private mapearNotificacionEditorial(
    articulo: ArticuloResumenBackend,
  ): NavbarNotificacion {
    const tituloEstado = this.obtenerTituloEstadoArticulo(articulo);

    return {
      id: `nuevo-envio-${articulo.id}`,
      articuloId: articulo.id,
      codigoArticulo: articulo.codigo,
      titulo: tituloEstado,
      detalle: `${articulo.codigo} - ${articulo.titulo}`,
      fecha: articulo.fecha_inicio ? new Date(articulo.fecha_inicio) : new Date(),
      enlace: this.obtenerEnlaceArticulo(articulo.id),
    };
  }

  private obtenerTituloEstadoArticulo(articulo: ArticuloResumenBackend): string {
    const etapa = (articulo.etapa_nombre ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (etapa.includes('public')) {
      return 'Artículo publicado';
    }

    if (etapa.includes('turnitin')) {
      return 'Cambio de estado: Turnitin';
    }

    if (etapa.includes('comite')) {
      return 'Cambio de estado: Comité Editorial';
    }

    if (etapa.includes('pares')) {
      return 'Acción pendiente: revisión por pares';
    }

    if (etapa.includes('certific')) {
      return 'Cambio de estado: Certificación';
    }

    if (etapa.includes('revision final')) {
      return 'Cambio de estado: Revisión final';
    }

    return 'Nuevo artículo recibido';
  }

  private obtenerEnlaceArticulo(articuloId: number): string {
    if (this.authService.hasAnyRole(['autor'])) {
      return `/panel-autor/timeline?articuloId=${articuloId}`;
    }

    if (this.authService.hasAnyRole(['revisor'])) {
      return '/panel-revisor/notificaciones';
    }

    if (this.authService.hasAnyRole(['comite-editorial'])) {
      return `/panel-comite-editorial/articulos/${articuloId}`;
    }

    return `/flujo-trabajo-articulo/${articuloId}`;
  }

  private obtenerDestinoNotificacion(notification: NavbarNotificacion): {
    commands: Array<string | number>;
    extras?: { queryParams?: Record<string, number> };
  } | null {
    const articuloId = Number(notification.articuloId);
    const tieneIdValido = Number.isFinite(articuloId) && articuloId > 0;

    if (this.hasRole('autor')) {
      if (!tieneIdValido) {
        return { commands: ['/panel-autor/notificaciones'] };
      }

      return {
        commands: ['/panel-autor/timeline'],
        extras: { queryParams: { articuloId } },
      };
    }

    if (this.hasRole('revisor')) {
      return { commands: ['/panel-revisor/notificaciones'] };
    }

    if (this.hasRole('comite-editorial')) {
      if (!tieneIdValido) {
        return { commands: ['/panel-comite-editorial/notificaciones'] };
      }

      return { commands: ['/panel-comite-editorial/articulos', articuloId] };
    }

    if (
      this.hasRole('admin') ||
      this.currentClaims?.canManageArticulos
    ) {
      if (!tieneIdValido) {
        return { commands: ['/articulos'] };
      }

      return { commands: ['/flujo-trabajo-articulo', articuloId] };
    }

    return null;
  }

  private hasRole(role: string): boolean {
    const roles = this.currentClaims?.roles;

    if (Array.isArray(roles) && roles.includes(role)) {
      return true;
    }

    return this.authService.hasAnyRole([role]);
  }

  private obtenerStorageKey(): string {
    const roles = this.currentClaims?.roles ?? [];
    const rolPrincipal = roles[0] ?? 'sin-rol';

    return `huellas.navbar.notificaciones.leidas.${rolPrincipal}`;
  }

  private obtenerIdsLeidos(): Set<string> {
    try {
      const raw = localStorage.getItem(this.obtenerStorageKey());
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
    localStorage.setItem(this.obtenerStorageKey(), JSON.stringify(Array.from(ids)));
  }

  private marcarNotificacionLeida(notificationId: string): void {
    const idsLeidos = this.obtenerIdsLeidos();
    idsLeidos.add(notificationId);
    this.guardarIdsLeidos(idsLeidos);

    this.notifications = this.notifications.map((notification) =>
      notification.id === notificationId ? { ...notification, leida: true } : notification,
    );
  }

  getRoleTitle(claims: AccessClaims | null | undefined): string {
    const role = claims?.roles?.[0];

    if (!role || typeof role !== 'string') {
      return 'Rol Sin Asignar';
    }

    return `Rol ${this.formatRole(role)}`;
  }

  private formatRole(role: string): string {
    return role
      .replace(/[_-]+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  async logout() {
    try {
      this.notificationDropdown?.close();
      await this.authService.logout();
      this.userMenuOpen = false;
      this.notificationMenuOpen = false;
      this.router.navigate(['/']);
    } catch (error) {
      console.error('No fue posible cerrar sesión desde el navbar.', error);
    }
  }

  goToPanel(): void {
    this.closeMenu();
    this.router.navigate([this.authService.getPostLoginRoute()]);
  }
}
