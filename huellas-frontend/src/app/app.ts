import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { FooterComponent } from './core/components/footer/footer.component';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { SideBar } from './core/components/side-bar/side-bar';
import { AuthService } from './core/auth/auth.service';
import { combineLatest } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    SideBar
],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  private readonly authService = inject(AuthService);

  user$ = this.authService.user$;
  claims$ = this.authService.claims$;
  sidebarCollapsed = false;
  isPanelLayout$!: import('rxjs').Observable<boolean>;
  showGlobalSidebar$!: import('rxjs').Observable<boolean>;

  constructor(private readonly router: Router) {
    this.isPanelLayout$ = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() =>
        this.router.url.startsWith('/panel-autor') ||
        this.router.url.startsWith('/panel-revisor') ||
        this.router.url.startsWith('/panel-comite-editorial'),
      ),
      startWith(
        window.location.pathname.startsWith('/panel-autor') ||
          window.location.pathname.startsWith('/panel-revisor') ||
          window.location.pathname.startsWith('/panel-comite-editorial'),
      ),
    );

    const isAdminSection$ = this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        const url = this.router.url;
        return (
          url.startsWith('/gestion-flujo-editorial') ||
          url.startsWith('/gestion-usuarios') ||
          url.startsWith('/articulos') ||
          url.startsWith('/flujo-trabajo-articulo') ||
          url.startsWith('/estadisticas')
        );
      }),
      startWith(
        window.location.pathname.startsWith('/gestion-flujo-editorial') ||
          window.location.pathname.startsWith('/gestion-usuarios') ||
          window.location.pathname.startsWith('/articulos') ||
          window.location.pathname.startsWith('/flujo-trabajo-articulo') ||
          window.location.pathname.startsWith('/estadisticas'),
      ),
    );

    this.showGlobalSidebar$ = combineLatest([
      this.user$,
      this.claims$,
      isAdminSection$,
    ]).pipe(
      map(([user, claims, isAdminSection]) => {
        const roles = Array.isArray(claims?.roles) ? claims.roles : [];
        const canAccessEditorialPanel =
          roles.some((role) => ['admin', 'director', 'monitor', 'comite-editorial'].includes(role)) ||
          Boolean(claims?.canManageUsers || claims?.canManageArticulos || claims?.canManageFlujoEditorial);

        return Boolean(user) && canAccessEditorialPanel && isAdminSection;
      }),
    );
  }

  onSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  get showFooter(): boolean {
    const currentPath = this.router.url.split('?')[0];
    return !['/login', '/register'].includes(currentPath);
  }
}

