import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AccessClaims, AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-panel-autor-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './panel-autor-layout.html',
  styleUrls: ['./panel-autor-layout.css']
})
export class PanelAutorLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  collapsed = false;
  userMenuOpen = false;

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
