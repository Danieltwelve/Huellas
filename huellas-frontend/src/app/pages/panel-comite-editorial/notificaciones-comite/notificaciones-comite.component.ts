import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
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
  leida: boolean;
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
  imports: [CommonModule],
  templateUrl: './notificaciones-comite.component.html',
  styleUrl: './notificaciones-comite.component.css',
})
export class NotificacionesComiteComponent implements OnInit, OnDestroy {
  private readonly articulosService = inject(ArticulosService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  private readonly storageKey = 'comite-notificaciones-leidas';

  notificaciones: NotificacionUI[] = [];
  filtro: 'todas' | 'no-leidas' = 'todas';
  resumen: ResumenNotificaciones = {
    totalPendientes: 0,
    totalVencidos: 0,
    totalProximoVencer: 0,
    totalNuevosUltimos3Dias: 0,
  };
  loading = true;

  get visibles(): NotificacionUI[] {
    if (this.filtro === 'no-leidas') {
      return this.notificaciones.filter((n) => !n.leida);
    }
    return this.notificaciones;
  }

  setFiltro(value: 'todas' | 'no-leidas'): void {
    this.filtro = value;
  }

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  marcarTodasLeidas(): void {
    const ids = new Set(this.notificaciones.map((n) => n.id));
    this.notificaciones = this.notificaciones.map((n) => ({ ...n, leida: true }));
    this.guardarIdsLeidas(ids);
    window.dispatchEvent(new CustomEvent('huellas-notifications-updated'));
  }

  abrirNotificacion(n: NotificacionUI): void {
    if (!n.leida) {
      n.leida = true;
      const ids = this.obtenerIdsLeidas();
      ids.add(n.id);
      this.guardarIdsLeidas(ids);
      window.dispatchEvent(new CustomEvent('huellas-notifications-updated'));
    }
    this.router.navigate(['/panel-comite-editorial/articulos', n.articuloId]);
  }

  formatearFecha(fecha: Date): string {
    if (!(fecha instanceof Date) || isNaN(fecha.getTime())) {
      return 'Sin fecha';
    }

    const ahora = Date.now();
    const diffMs = Math.max(0, ahora - fecha.getTime());
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMin < 1) return 'Hace unos segundos';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} dias`;

    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private cargarNotificaciones(): void {
    this.loading = true;

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
          const idsActuales = articulos.map((a) => a.id);
          const keyVistos = 'comite-notificaciones-vistos';
          const keyHistorial = 'comite-historial-notificaciones-nuevos';

          const vistosRaw = localStorage.getItem(keyVistos);
          const vistos = vistosRaw ? this.parseIds(vistosRaw) : [];

          const historialRaw = localStorage.getItem(keyHistorial);
          let historial: any[] = [];
          if (historialRaw) {
            try {
              historial = JSON.parse(historialRaw);
            } catch {
              historial = [];
            }
          }

          const nuevos = (vistosRaw && historial.length > 0)
            ? articulos.filter((a) => !vistos.includes(a.id))
            : articulos;

          if (nuevos.length > 0) {
            const nuevasNotifs = nuevos.map((articulo) => ({
              id: `nuevo-${articulo.id}`,
              tipo: 'nuevo-articulo',
              titulo: 'Nuevo artículo asignado',
              mensaje: `Se te asignó ${articulo.codigo}: ${articulo.titulo}`,
              articuloId: articulo.id,
              codigo: articulo.codigo,
              fecha: new Date().toISOString(),
            }));
            historial.push(...nuevasNotifs);
            localStorage.setItem(keyHistorial, JSON.stringify(historial));

            const vistosActualizados = Array.from(new Set([...vistos, ...idsActuales]));
            localStorage.setItem(keyVistos, JSON.stringify(vistosActualizados));
          } else if (vistos.length === 0 && idsActuales.length > 0) {
            localStorage.setItem(keyVistos, JSON.stringify(idsActuales));
          }

          const idsLeidas = this.obtenerIdsLeidas();

          const nuevosNotifs = this.construirNotificacionesNuevosArticulos(articulos, idsLeidas);
          const sinRevisar = this.construirNotificacionesSinRevisar(articulos, idsLeidas);
          const recordatorios = this.construirNotificacionesRecordatorio(vencimientos, idsLeidas);

          this.notificaciones = [...recordatorios, ...nuevosNotifs, ...sinRevisar].sort(
            (a, b) => b.fecha.getTime() - a.fecha.getTime(),
          );

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

  private construirNotificacionesNuevosArticulos(
    articulos: ArticuloResumenBackend[],
    idsLeidas: Set<string>,
  ): NotificacionUI[] {
    return articulos.map((articulo) => {
      const id = `nuevo-${articulo.id}`;
      return {
        id,
        tipo: 'nuevo-articulo' as const,
        titulo: 'Nuevo artículo asignado',
        mensaje: `Se te asignó ${articulo.codigo}: ${articulo.titulo}`,
        articuloId: articulo.id,
        codigo: articulo.codigo,
        fecha: articulo.fecha_asignacion ? new Date(articulo.fecha_asignacion) : new Date(),
        leida: idsLeidas.has(id),
      };
    });
  }


  private construirNotificacionesSinRevisar(
    articulos: ArticuloResumenBackend[],
    idsLeidas: Set<string>,
  ): NotificacionUI[] {
    return articulos
      .filter(
        (a) =>
          a.estado_evaluacion === 'pendiente' &&
          a.dias_restantes !== null &&
          typeof a.dias_restantes === 'number' &&
          a.dias_restantes > 5,
      )
      .slice(0, 5)
      .map((articulo) => {
        const id = `sin-revisar-${articulo.id}`;
        return {
          id,
          tipo: 'sin-revisar' as const,
          titulo: 'Artículo pendiente de revisión',
          mensaje: `${articulo.codigo}: ${articulo.titulo} - Vence en ${articulo.dias_restantes} días`,
          articuloId: articulo.id,
          codigo: articulo.codigo,
          diasRestantes: articulo.dias_restantes,
          fecha: new Date(),
          leida: idsLeidas.has(id),
        };
      });
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

  private construirNotificacionesRecordatorio(
    items: ComiteNotificacionVencimiento[],
    idsLeidas: Set<string>,
  ): NotificacionUI[] {
    return items.map((n) => {
      const id = `rev-${n.articuloId}-${n.tipo}`;
      return {
        id,
        tipo: n.tipo as 'vencido' | 'proximo-vencer',
        titulo: n.tipo === 'vencido' ? 'Revisión vencida' : 'Recordatorio de revisión',
        mensaje: n.mensaje,
        articuloId: n.articuloId,
        codigo: n.codigo,
        fecha: new Date(),
        leida: idsLeidas.has(id),
      };
    });
  }

  private parseIds(raw: string): number[] {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'number') : [];
    } catch {
      return [];
    }
  }

  private obtenerIdsLeidas(): Set<string> {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw) as string[];
      return new Set(parsed.filter((id) => typeof id === 'string'));
    } catch {
      return new Set<string>();
    }
  }

  private guardarIdsLeidas(ids: Set<string>): void {
    localStorage.setItem(this.storageKey, JSON.stringify(Array.from(ids)));
  }
}
