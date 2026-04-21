import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import {
  ArticuloResumenBackend,
  ArticulosService,
  ComiteNotificacionVencimiento,
} from '../../../core/articulos/articulos.service';

interface NotificacionUI {
  id: string;
  tipo: 'nuevo-articulo' | 'vencido' | 'proximo-vencer' | 'sin-revisar';
  titulo: string;
  mensaje: string;
  articuloId: number;
  codigo?: string;
  fecha: Date;
  diasRestantes?: number | null;
}

interface ResumenNotificaciones {
  totalPendientes: number;
  totalVencidos: number;
  totalProximoVencer: number;
  totalNuevosUltimos3Dias: number;
}

@Component({
  selector: 'app-notificaciones-comite',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notificaciones-comite.component.html',
  styleUrl: './notificaciones-comite.component.css',
})
export class NotificacionesComiteComponent implements OnInit, OnDestroy {
  private readonly articulosService = inject(ArticulosService);
  private readonly destroy$ = new Subject<void>();

  notificaciones: NotificacionUI[] = [];
  resumen: ResumenNotificaciones = {
    totalPendientes: 0,
    totalVencidos: 0,
    totalProximoVencer: 0,
    totalNuevosUltimos3Dias: 0,
  };
  loading = true;

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarNotificaciones(): void {
    this.loading = true;
    console.log('[Notificaciones] Iniciando carga de notificaciones...');

    forkJoin({
      articulos: this.articulosService.getArticulosComiteAsignados().pipe(
        catchError((err) => {
          console.error('[Notificaciones] Error cargando artículos:', err);
          return of([]);
        }),
      ),
      vencimientos: this.articulosService.getNotificacionesVencimientoComite().pipe(
        catchError((err) => {
          console.error('[Notificaciones] Error cargando vencimientos:', err);
          return of([]);
        }),
      ),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ articulos, vencimientos }) => {
          console.log('[Notificaciones] ✓ Artículos asignados:', articulos.length, 'items');
          if (articulos.length > 0) {
            console.table(articulos.map(a => ({ 
              id: a.id, 
              codigo: a.codigo, 
              titulo: a.titulo,
              estado: a.estado_evaluacion,
              diasRestantes: a.dias_restantes
            })));
          } else {
            console.warn('[Notificaciones] ⚠ Sin artículos asignados al usuario actual');
          }

          console.log('[Notificaciones] ✓ Vencimientos:', vencimientos.length, 'items');
          if (vencimientos.length > 0) {
            console.table(vencimientos);
          }

          // Construir notificaciones
          const nuevos = this.construirNotificacionesNuevosArticulos(articulos);
          const sinRevisar = this.construirNotificacionesSinRevisar(articulos);
          const recordatorios = this.construirNotificacionesRecordatorio(vencimientos);

          console.log('[Notificaciones] Categorías:', {
            nuevos: nuevos.length,
            sinRevisar: sinRevisar.length,
            recordatorios: recordatorios.length,
          });

          // Combinar todas las notificaciones
          this.notificaciones = [...recordatorios, ...nuevos, ...sinRevisar].sort(
            (a, b) => b.fecha.getTime() - a.fecha.getTime(),
          );

          console.log('[Notificaciones] ✓ Total notificaciones combinadas:', this.notificaciones.length);

          // Calcular resumen
          this.calcularResumen(articulos, vencimientos);
          this.loading = false;
        },
        error: (err) => {
          console.error('[Notificaciones] ❌ Error fatal:', err);
          this.notificaciones = [];
          this.loading = false;
        },
      });
  }

  private construirNotificacionesNuevosArticulos(articulos: ArticuloResumenBackend[]): NotificacionUI[] {
    const idsActuales = articulos.map((a) => a.id);
    const key = 'comite-notificaciones-vistos';
    const vistosRaw = localStorage.getItem(key);
    const vistos = vistosRaw ? this.parseIds(vistosRaw) : [];

    // En el primer ingreso solo registramos estado base para evitar falsos "nuevos".
    if (!vistosRaw) {
      localStorage.setItem(key, JSON.stringify(idsActuales));
      return [];
    }

    const nuevos = articulos.filter((a) => !vistos.includes(a.id));
    localStorage.setItem(key, JSON.stringify(idsActuales));

    return nuevos.map((articulo) => ({
      id: `nuevo-${articulo.id}`,
      tipo: 'nuevo-articulo',
      titulo: 'Nuevo artículo asignado',
      mensaje: `Se te asignó ${articulo.codigo}: ${articulo.titulo}`,
      articuloId: articulo.id,
      codigo: articulo.codigo,
      fecha: new Date(),
    }));
  }

  private construirNotificacionesSinRevisar(articulos: ArticuloResumenBackend[]): NotificacionUI[] {
    return articulos
      .filter(
        (a) =>
          a.estado_evaluacion === 'pendiente' &&
          a.dias_restantes !== null &&
          typeof a.dias_restantes === 'number' &&
          a.dias_restantes > 5,
      )
      .slice(0, 5)
      .map((articulo) => ({
        id: `sin-revisar-${articulo.id}`,
        tipo: 'sin-revisar',
        titulo: 'Artículo pendiente de revisión',
        mensaje: `${articulo.codigo}: ${articulo.titulo} - Vence en ${articulo.dias_restantes} días`,
        articuloId: articulo.id,
        codigo: articulo.codigo,
        diasRestantes: articulo.dias_restantes,
        fecha: new Date(),
      }));
  }

  private calcularResumen(
    articulos: ArticuloResumenBackend[],
    vencimientos: ComiteNotificacionVencimiento[],
  ): void {
    const pendientes = articulos.filter((a) => a.estado_evaluacion === 'pendiente');
    const vencidos = vencimientos.filter((v) => v.tipo === 'vencido').length;
    const proximoVencer = vencimientos.filter((v) => v.tipo === 'proximo-vencer').length;
    const hace3Dias = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const nuevosUltimos3Dias = articulos.filter(
      (a) => a.fecha_asignacion && new Date(a.fecha_asignacion).getTime() > hace3Dias,
    ).length;

    this.resumen = {
      totalPendientes: pendientes.length,
      totalVencidos: vencidos,
      totalProximoVencer: proximoVencer,
      totalNuevosUltimos3Dias: nuevosUltimos3Dias,
    };
  }

  private construirNotificacionesRecordatorio(items: ComiteNotificacionVencimiento[]): NotificacionUI[] {
    return items.map((n) => ({
      id: `rev-${n.articuloId}-${n.tipo}`,
      tipo: n.tipo,
      titulo: n.tipo === 'vencido' ? 'Revisión vencida' : 'Recordatorio de revisión',
      mensaje: n.mensaje,
      articuloId: n.articuloId,
      codigo: n.codigo,
      fecha: new Date(),
    }));
  }

  private parseIds(raw: string): number[] {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'number') : [];
    } catch {
      return [];
    }
  }

  getTipoClase(tipo: NotificacionUI['tipo']): string {
    if (tipo === 'nuevo-articulo') {
      return 'tipo-nuevo';
    }

    if (tipo === 'vencido') {
      return 'tipo-vencido';
    }

    if (tipo === 'proximo-vencer') {
      return 'tipo-recordatorio';
    }

    return 'tipo-sin-revisar';
  }
}
