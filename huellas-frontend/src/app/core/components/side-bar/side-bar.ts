import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { AuthService } from '../../auth/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-side-bar',
  imports: [CommonModule],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss',
})
export class SideBar {
  private readonly authService = inject(AuthService);

  collapsed = false;

  @Output() collapsedChange = new EventEmitter<boolean>();

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  mainItems: MenuItem[] = [
    { label: 'Gestión de Flujo Editorial', icon: 'list-check', adminOnly: true },
    { label: 'Gestión de Usuarios', icon: 'users', adminOnly: true },
    { label: 'Artículos', icon: 'file', adminOnly: true },
    { label: 'Estadísticas', icon: 'chart', adminOnly: true },
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
}
