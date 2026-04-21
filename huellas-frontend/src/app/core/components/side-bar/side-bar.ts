import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Output, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string;
  allowedRoles?: string[];
  route?: string;
  action?: 'logout';
}

@Component({
  selector: 'app-side-bar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.css',
})
export class SideBar {
  private readonly authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  collapsed = false;

  @Output() collapsedChange = new EventEmitter<boolean>();

  ngOnInit(): void {
    setTimeout(() => {
      this.collapsedChange.emit(this.collapsed);
    });
  }

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  mainItems: MenuItem[] = [
    {
      label: 'Timeline Editorial',
      icon: 'clock-history',
      allowedRoles: ['admin', 'director', 'monitor', 'comite-editorial'],
      route: '/gestion-flujo-editorial',
    },
    {
      label: 'Gestión de Usuarios',
      icon: 'users',
      allowedRoles: ['admin', 'director', 'monitor'],
      route: '/gestion-usuarios',
    },
    {
      label: 'Panel Comité Editorial',
      icon: 'list-check',
      allowedRoles: ['comite-editorial'],
      route: '/panel-comite-editorial',
    },
    {
      label: 'Artículos',
      icon: 'file',
      allowedRoles: ['admin', 'director', 'monitor'],
      route: '/articulos',
    },
    {
      label: 'Estadísticas',
      icon: 'chart',
      allowedRoles: ['admin', 'director', 'monitor', 'comite-editorial'],
      route: '/estadisticas',
    },
  ];

  visibleMainItems$ = this.authService.claims$.pipe(
    map((claims) => {
      const roles = claims.roles ?? [];
      return this.mainItems.filter((item) => {
        if (!item.allowedRoles || item.allowedRoles.length === 0) {
          return true;
        }

        return roles.some((role) => item.allowedRoles?.includes(role));
      });
    }),
  );

  bottomItems: MenuItem[] = [
    { label: 'Configuración', icon: 'settings', route: '/configuracion' },
    { label: 'Cerrar sesión', icon: 'logout', action: 'logout' },
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
