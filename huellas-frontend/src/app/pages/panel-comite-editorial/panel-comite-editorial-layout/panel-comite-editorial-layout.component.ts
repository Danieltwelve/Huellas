import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ArticulosService } from '../../../core/articulos/articulos.service';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
  private destroy$ = new Subject<void>();

  collapsed = false;
  totalNotificaciones = 0;
  mostrarAlertaNotificaciones = false;
  mensajeAlertaNotificaciones = '';

  ngOnInit(): void {
    this.cargarNotificaciones();

    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cargarNotificaciones(false));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarNotificaciones(esPrimeraCarga = true): void {
    this.articulosService.getArticulosComiteAsignados().subscribe({
      next: (articulos) => {
        const idsActuales = articulos.map((a) => a.id);
        const key = 'comite-notificaciones-vistos';
        const idsPrevios = this.getIdsGuardados(key);
        const nuevosAsignados = idsPrevios.length
          ? idsActuales.filter((id) => !idsPrevios.includes(id)).length
          : 0;

        localStorage.setItem(key, JSON.stringify(idsActuales));

        this.articulosService.getNotificacionesVencimientoComite().subscribe({
          next: (recordatorios) => {
            this.totalNotificaciones = nuevosAsignados + recordatorios.length;

            if (!esPrimeraCarga && this.totalNotificaciones > 0) {
              this.mostrarAlertaNotificaciones = true;
              this.mensajeAlertaNotificaciones =
                nuevosAsignados > 0
                  ? `Se asignaron ${nuevosAsignados} artículo(s) nuevo(s).`
                  : 'Tienes recordatorios de revisión pendientes.';
            }
          },
          error: () => {
            this.totalNotificaciones = nuevosAsignados;
          },
        });
      },
      error: () => {
        this.totalNotificaciones = 0;
      },
    });
  }

  private getIdsGuardados(key: string): number[] {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'number') : [];
    } catch {
      return [];
    }
  }

  toggleSidebar(): void {
    this.collapsed = !this.collapsed;
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
