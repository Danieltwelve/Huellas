import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class NavbarComponent {

  private authService = inject(AuthService);

  menuOpen = false;
  openDropdown: string | null = null;

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
  }

  toggleDropdown(dropdown: string) {
    this.openDropdown = this.openDropdown === dropdown ? null : dropdown;
  }
}
