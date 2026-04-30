import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
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
  imports: [CommonModule, RouterModule],
})
export class NavbarComponent implements OnInit {

  private authService = inject(AuthService);
  private router = inject(Router);
  private articulosService = inject(ArticulosService);
  private articulosAutorService = inject(ArticulosAutorService);
  private destroy$ = new Subject<void>();
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

  toggleUserMenu() {
    this.notificationMenuOpen = false;
    this.userMenuOpen = !this.userMenuOpen;
  }

  toggleNotifications(): void {
    this.userMenuOpen = false;
    this.notificationMenuOpen = !this.notificationMenuOpen;
  }

  navigateToNotification(notification: NavbarNotificacion): void {
    this.marcarNotificacionLeida(notification.id);
    this.notificationMenuOpen = false;
    this.router.navigateByUrl(notification.enlace);
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

    if (
      this.authService.hasAnyRole(['admin', 'director', 'monitor', 'comite-editorial']) ||
      claims.canManageArticulos ||
      claims.canManageFlujoEditorial
    ) {
      this.cargarNotificacionesEditoriales();
      return;
    }

    this.notifications = [];
    this.notificationError = null;
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

    this.articulosService.getResumenArticulos().subscribe({
      next: (articulos) => {
        const idsLeidos = this.obtenerIdsLeidos();

        this.notifications = articulos
          .map((item) => this.mapearNotificacionEditorial(item))
          .map((item) => ({
            ...item,
            leida: idsLeidos.has(item.id),
          }))
          .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        this.notificationLoading = false;
      },
      error: () => {
        this.notifications = [];
        this.notificationError = 'No se pudieron cargar los nuevos envíos.';
        this.notificationLoading = false;
      },
    });
  }

  private mapearNotificacionAutor(item: NotificacionAutorBackend): NavbarNotificacion {
    return {
      id: item.id,
      articuloId: item.articuloId,
      codigoArticulo: item.codigoArticulo,
      titulo: item.titulo,
      detalle: item.detalle,
      fecha: new Date(item.fecha),
      enlace: this.obtenerEnlaceArticulo(item.articuloId),
    };
  }

  private mapearNotificacionEditorial(
    articulo: ArticuloResumenBackend,
  ): NavbarNotificacion {
    return {
      id: `nuevo-envio-${articulo.id}`,
      articuloId: articulo.id,
      codigoArticulo: articulo.codigo,
      titulo: 'Nuevo artículo recibido',
      detalle: `${articulo.codigo} - ${articulo.titulo}`,
      fecha: articulo.fecha_inicio ? new Date(articulo.fecha_inicio) : new Date(),
      enlace: this.obtenerEnlaceArticulo(articulo.id),
    };
  }

  private obtenerEnlaceArticulo(articuloId: number): string {
    if (this.authService.hasAnyRole(['autor'])) {
      return `/panel-autor/detalle-articulo/${articuloId}`;
    }

    if (this.authService.hasAnyRole(['comite-editorial'])) {
      return `/panel-comite-editorial/articulos/${articuloId}`;
    }

    return `/flujo-trabajo-articulo/${articuloId}`;
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
