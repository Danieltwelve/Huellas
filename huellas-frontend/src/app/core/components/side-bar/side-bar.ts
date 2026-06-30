import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string;
  allowedRoles?: string[];
  route?: string;
  action?: 'logout';
  queryParams?: any;
  routerLinkActiveOptions?: any;
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

  @Input() collapsed = typeof window !== 'undefined' ? window.innerWidth <= 960 : false;

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

  onItemClick(): void {
    if (window.innerWidth <= 960) {
      this.collapsed = true;
      this.collapsedChange.emit(this.collapsed);
    }
  }

  mainItems: MenuItem[] = [
    {
      label: 'Gestión Editorial',
      icon: 'clock-history',
      allowedRoles: ['admin'],
      route: '/gestion-flujo-editorial',
    },
    {
      label: 'Gestión de Usuarios',
      icon: 'users',
      allowedRoles: ['admin'],
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
      allowedRoles: ['admin'],
      route: '/articulos',
    },
    {
      label: 'Seguimiento',
      icon: 'eye',
      allowedRoles: ['admin'],
      route: '/seguimiento',
    },
    {
      label: 'Centro de Notificaciones',
      icon: 'bell',
      allowedRoles: ['admin', 'comite-editorial'],
      route: '/notificaciones',
    },
    {
      label: 'Certificados',
      icon: 'certificate',
      allowedRoles: ['admin'],
      route: '/certificados-editoriales',
    },
    {
      label: 'Publicación',
      icon: 'newspaper',
      allowedRoles: ['admin'],
      route: '/publicacion',
    },
    {
      label: 'Estadísticas',
      icon: 'chart',
      allowedRoles: ['admin'],
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
    { label: 'Perfil', icon: 'settings', route: '/perfil' },
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
