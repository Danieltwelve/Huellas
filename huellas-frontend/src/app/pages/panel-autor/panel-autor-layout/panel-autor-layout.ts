import { AsyncPipe } from '@angular/common';
import { Component, inject, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccessClaims, AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-panel-autor-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, AsyncPipe],
  templateUrl: './panel-autor-layout.html',
  styleUrls: ['./panel-autor-layout.css']
})
export class PanelAutorLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  collapsed = false;
  userMenuOpen = false;

  ngOnInit(): void {
    if (window.innerWidth < 960) {
      this.collapsed = true;
    }
  }

  claims$ = this.authService.claims$;
  user$ = this.authService.user$;

  toggleSidebar() {
    this.collapsed = !this.collapsed;
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  getRoleTitle(claims: AccessClaims | null | undefined): string {
    const role = claims?.roles?.[0];
    if (!role || typeof role !== 'string') return 'Rol Sin Asignar';
    return `Rol ${role.replace(/[_-]+/g, ' ').trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-actions')) {
      this.userMenuOpen = false;
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth < 960) {
      this.collapsed = true;
    }
  }

  async logout() {
    try {
      this.userMenuOpen = false;
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (e) {
      console.error(e);
    }
  }
}
