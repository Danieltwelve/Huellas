import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Output, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string;
  adminOnly?: boolean;
  route?: string;
}

@Component({
  selector: 'app-side-bar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss',
})
export class SideBar {
  private readonly authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  collapsed = false;

  @Output() collapsedChange = new EventEmitter<boolean>();

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  mainItems: MenuItem[] = [
    {
      label: 'Gestión de Flujo Editorial',
      icon: 'list-check',
      adminOnly: true,
      route: '/gestion-flujo-editorial',
    },
    { label: 'Gestión de Usuarios', icon: 'users', adminOnly: true, route: '/gestion-usuarios' },
    { label: 'Artículos', icon: 'file', adminOnly: true, route: '/articulos' },
    { label: 'Estadísticas', icon: 'chart', adminOnly: true, route: '/estadisticas' },
  ];

  visibleMainItems$ = this.authService.claims$.pipe(
    map((claims) => {
      const isAdmin = (claims.roles ?? []).includes('admin');
      return this.mainItems.filter((item) => !item.adminOnly || isAdmin);
    }),
  );

  bottomItems: MenuItem[] = [
    { label: 'Cerrar sesión', icon: 'logout' },
    { label: 'Configuración', icon: 'settings' },
  ];

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/']);
      window.location.reload();
    } catch (error) {
      alert('Hubo un problema al cerrar sesión.');
      this.cdr.detectChanges();
    }
  }
}
