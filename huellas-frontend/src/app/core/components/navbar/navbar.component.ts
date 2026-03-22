import { Component, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';
import { AccessClaims, AuthService } from '../../auth/auth.service';

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
  menuOpen = false;
  openDropdown: string | null = null;
  userMenuOpen = false;

  claims$ = this.authService.claims$;
  user$ = this.authService.user$;
  canAccessPanel$ = combineLatest([this.user$, this.claims$]).pipe(
    map(([user, claims]) => {
      if (!user) return false;

      return Boolean(
        claims.canManageUsers ||
          claims.canSubmitEnvios ||
          claims.canViewArchivos ||
          (claims.roles?.length ?? 0) > 0,
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
    ).subscribe(() => {
      this.closeMenu();
    });
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
  }

  toggleDropdown(dropdown: string) {
    this.openDropdown = this.openDropdown === dropdown ? null : dropdown;
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
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
