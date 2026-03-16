import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AccessClaims, AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class NavbarComponent {

  private authService = inject(AuthService);
  private router = inject(Router);
  menuOpen = false;
  openDropdown: string | null = null;
  userMenuOpen = false;

  claims$ = this.authService.claims$;
  user$ = this.authService.user$;

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
}
