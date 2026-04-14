import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ArticulosService } from '../../../core/articulos/articulos.service';

@Component({
  selector: 'app-panel-comite-editorial-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './panel-comite-editorial-layout.component.html',
  styleUrls: ['./panel-comite-editorial-layout.component.css'],
})
export class PanelComiteEditorialLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly articulosService = inject(ArticulosService);

  collapsed = false;
  totalAsignados = 0;
  totalPendientes = 0;
  totalEvaluados = 0;

  ngOnInit(): void {
    this.cargarContadores();
  }

  private cargarContadores(): void {
    this.articulosService.getArticulosComiteAsignados().subscribe({
      next: (articulos) => {
        this.totalAsignados = articulos.length;
        this.totalPendientes = articulos.filter((articulo) => articulo.estado_evaluacion === 'pendiente').length;
        this.totalEvaluados = articulos.filter(
          (articulo) =>
            articulo.estado_evaluacion === 'evaluado-aceptado' ||
            articulo.estado_evaluacion === 'evaluado-rechazado',
        ).length;
      },
      error: () => {
        this.totalAsignados = 0;
        this.totalPendientes = 0;
        this.totalEvaluados = 0;
      },
    });
  }

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
