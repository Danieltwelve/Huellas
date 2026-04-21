import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { ArticulosService } from '../../../core/articulos/articulos.service';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface MetricasDashboard {
  totalAsignados: number;
  totalPendientes: number;
  totalEvaluados: number;
  totalVencidos: number;
  porcentajeComplecion: number;
  tiempoPromedioDias: number;
  tasaAprobacion: number;
  articulosMasUrgentes: Array<{
    id: number;
    codigo: string;
    titulo: string;
    diasRestantes: number;
    estado: string;
  }>;
}

@Component({
  selector: 'app-dashboard-comite',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-comite.component.html',
  styleUrl: './dashboard-comite.component.css',
})
export class DashboardComiteComponent implements OnInit, OnDestroy {
  private readonly articulosService = inject(ArticulosService);
  private readonly router = inject(Router);
  private destroy$ = new Subject<void>();

  metricas: MetricasDashboard | null = null;
  loading = true;
  error: string | null = null;

  ngOnInit(): void {
    this.cargarMetricas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarMetricas(): void {
    this.loading = true;
    this.error = null;

    this.articulosService
      .getArticulosComiteAsignados()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (articulos: any[]) => {
          const pendientes = articulos.filter((a) => a.estado_evaluacion === 'pendiente');
          const evaluados = articulos.filter((a) => a.estado_evaluacion !== 'pendiente');
          const vencidos = pendientes.filter((a) => a.esta_vencido);
          const aprobados = evaluados.filter((a) => a.estado_evaluacion === 'evaluado-aceptado');

          const tiemposEnDias = articulos
            .filter((a) => a.fecha_asignacion)
            .map((a) => {
              const asignacion = new Date(a.fecha_asignacion);
              const ahora = new Date();
              return Math.floor((ahora.getTime() - asignacion.getTime()) / (1000 * 60 * 60 * 24));
            });

          const tiempoPromedio =
            tiemposEnDias.length > 0
              ? Math.round(tiemposEnDias.reduce((a, b) => a + b, 0) / tiemposEnDias.length)
              : 0;

          const articulosMasUrgentes = pendientes
            .filter((a) => a.dias_restantes !== null && a.dias_restantes >= 0)
            .sort((a, b) => (a.dias_restantes ?? 999) - (b.dias_restantes ?? 999))
            .slice(0, 5)
            .map((a) => ({
              id: a.id,
              codigo: a.codigo,
              titulo: a.titulo,
              diasRestantes: a.dias_restantes ?? 0,
              estado: a.esta_vencido ? 'VENCIDO' : `${a.dias_restantes} días`,
            }));

          this.metricas = {
            totalAsignados: articulos.length,
            totalPendientes: pendientes.length,
            totalEvaluados: evaluados.length,
            totalVencidos: vencidos.length,
            porcentajeComplecion: articulos.length > 0 ? Math.round((evaluados.length / articulos.length) * 100) : 0,
            tiempoPromedioDias: tiempoPromedio,
            tasaAprobacion: evaluados.length > 0 ? Math.round((aprobados.length / evaluados.length) * 100) : 0,
            articulosMasUrgentes,
          };

          this.loading = false;
        },
        error: (err) => {
          this.error = 'Error al cargar las métricas del dashboard';
          this.loading = false;
        },
      });
  }

  irAlArticulo(articuloId: number): void {
    this.router.navigate(['/panel-comite-editorial/articulos', articuloId]);
  }

  getClasePrioridad(diasRestantes: number): string {
    if (diasRestantes < 0) return 'urgente';
    if (diasRestantes <= 3) return 'critica';
    if (diasRestantes <= 7) return 'alta';
    return 'normal';
  }
}
