import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ARTICULOS_ASIGNADOS_MOCK } from '../panel-revisor.data';
import { ArticuloRevisorDto, RevisoresService, HistorialRevisionRevisorDto } from '../../../core/revisores/revisores.service';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type OrdenTabla = 'llegada_desc' | 'llegada_asc' | 'vence_asc' | 'vence_desc';

@Component({
  selector: 'app-articulos-asignados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './articulos-asignados.component.html',
  styleUrls: ['./articulos-asignados.component.css'],
})
export class ArticulosAsignadosComponent implements OnInit {
  private readonly revisoresService = inject(RevisoresService);
  private readonly router = inject(Router);

  articulos: ArticuloRevisorDto[] = [];
  private articulosFuente: ArticuloRevisorDto[] = ARTICULOS_ASIGNADOS_MOCK;
  private historialFuente: HistorialRevisionRevisorDto[] = [];

  readonly opcionesOrden: Array<{ valor: OrdenTabla; etiqueta: string }> = [
    { valor: 'llegada_desc', etiqueta: 'Orden de llegada: más reciente' },
    { valor: 'llegada_asc', etiqueta: 'Orden de llegada: más antiguo' },
    { valor: 'vence_asc', etiqueta: 'Vence primero' },
    { valor: 'vence_desc', etiqueta: 'Vence después' },
  ];

  ordenActual: OrdenTabla = 'llegada_desc';

  // Nuevas variables para filtros y control de la interfaz
  searchQuery: string = '';
  filtroEstado: 'todos' | 'pendiente' | 'aceptado' | 'rechazado' = 'todos';
  accionesRapidasContraido: boolean = false;

  ngOnInit(): void {
    forkJoin([
      this.revisoresService.getArticulosAsignadosRevisor(),
      this.revisoresService.getHistorialRevisionRevisor(),
    ]).subscribe({
      next: ([articulos, historial]) => {
        this.articulosFuente = articulos;
        this.historialFuente = historial;
        this.aplicarFiltrosYOrden();
      },
      error: () => {
        this.articulosFuente = ARTICULOS_ASIGNADOS_MOCK;
        this.historialFuente = [];
        this.aplicarFiltrosYOrden();
      },
    });
  }

  onOrdenChange(valor: string): void {
    if (!this.esOrdenTabla(valor)) {
      return;
    }

    this.ordenActual = valor;
    this.aplicarFiltrosYOrden();
  }

  onSearchQueryChange(val: string): void {
    this.searchQuery = val;
    this.aplicarFiltrosYOrden();
  }

  onFiltroEstadoChange(estado: 'todos' | 'pendiente' | 'aceptado' | 'rechazado'): void {
    this.filtroEstado = estado;
    this.aplicarFiltrosYOrden();
  }

  toggleAccionesRapidas(): void {
    this.accionesRapidasContraido = !this.accionesRapidasContraido;
  }

  getEtiquetaEstado(estado: string): string {
    if (estado === 'en-proceso') {
      return 'En revisión';
    }
    if (estado === 'evaluado') {
      return 'Evaluado';
    }
    return 'Pendiente';
  }

  /**
   * Returns the display label for the status column.
   * If the article deadline is past (and not yet evaluated), shows 'Vencido'.
   */
  getEtiquetaEstadoVisible(articulo: { estado: string; fechaLimite: string | null }): string {
    if (articulo.estado !== 'evaluado' && this.esVencido(articulo.fechaLimite)) {
      return 'Vencido';
    }
    return this.getEtiquetaEstado(articulo.estado);
  }

  /** Returns true if the reviewer can still perform/view the review.
   * Only blocks when the deadline is past AND the article is NOT yet evaluated. */
  puedeRevisar(articulo: { estado: string; fechaLimite: string | null }): boolean {
    // Already evaluated → always allow viewing
    if (articulo.estado === 'evaluado') return true;
    // Not evaluated → block if deadline has passed
    return !this.esVencido(articulo.fechaLimite);
  }

  getEtiquetaPrioridad(prioridad: 'alta' | 'media' | 'baja'): string {
    if (prioridad === 'alta') {
      return 'Alta';
    }

    if (prioridad === 'media') {
      return 'Media';
    }

    return 'Baja';
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) {
      return '—';
    }

    const fechaParseada = new Date(fecha);
    if (Number.isNaN(fechaParseada.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(fechaParseada);
  }

  esVencido(fecha: string | null): boolean {
    const fechaLimite = this.obtenerFechaValida(fecha);
    if (!fechaLimite) {
      return false;
    }

    const finDelDia = new Date(fechaLimite);
    finDelDia.setHours(23, 59, 59, 999);

    return finDelDia.getTime() < Date.now();
  }

  estaPorVencer(fecha: string | null): boolean {
    const fechaLimite = this.obtenerFechaValida(fecha);
    if (!fechaLimite) {
      return false;
    }

    const finDelDia = new Date(fechaLimite);
    finDelDia.setHours(23, 59, 59, 999);

    const diferenciaMs = finDelDia.getTime() - Date.now();
    if (diferenciaMs < 0) {
      return false;
    }

    const tresDiasMs = 3 * 24 * 60 * 60 * 1000;
    return diferenciaMs <= tresDiasMs;
  }

  irARevision(articuloId: number): void {
    this.router.navigate(['/panel-revisor/realizar-revision'], {
      queryParams: { articuloId },
    });
  }

  irAHistorial(): void {
    this.router.navigate(['/panel-revisor/historial']);
  }

  irANotificaciones(): void {
    this.router.navigate(['/panel-revisor/notificaciones']);
  }

  exportarExcel(): void {
    if (!this.articulos.length) {
      return;
    }

    const headers = ['Código', 'Título', 'Estado', 'Prioridad', 'Fecha de asignación', 'Fecha límite'];
    const rows = this.articulos.map(a => [
      a.codigo,
      a.titulo,
      this.getEtiquetaEstado(a.estado),
      this.getEtiquetaPrioridad(a.prioridad),
      this.formatearFecha(a.fechaAsignacion),
      this.formatearFecha(a.fechaLimite)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `articulos_asignados_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  exportarPDF(): void {
    if (!this.articulos.length) {
      return;
    }

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const brandColor = '#0f766e';
    const generatedAt = new Intl.DateTimeFormat('es-ES', { dateStyle: 'full' }).format(new Date());

    // Encabezado
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, pageWidth, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('REVISTA HUELLAS', 14, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Reporte de Artículos Asignados para Evaluación', 14, 17);
    doc.setFontSize(8);
    doc.text(`Generado: ${generatedAt}`, 14, 22);

    // Pie de página
    const drawFooter = (pageNumber: number): void => {
      doc.setDrawColor(224, 231, 240);
      doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text('Documento generado automáticamente por el sistema de revisión Huellas.', 14, pageHeight - 8);
      doc.text(`Página ${pageNumber}`, pageWidth - 28, pageHeight - 8);
    };

    const tableBody = this.articulos.map(a => [
      a.codigo,
      a.titulo,
      this.getEtiquetaEstado(a.estado),
      this.getEtiquetaPrioridad(a.prioridad),
      this.formatearFecha(a.fechaAsignacion),
      this.formatearFecha(a.fechaLimite)
    ]);

    autoTable(doc, {
      startY: 34,
      head: [['Código', 'Título', 'Estado', 'Prioridad', 'Fecha Asig.', 'Fecha Límite']],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        textColor: '#0f172a',
        lineColor: '#d9e2ec',
        lineWidth: 0.2,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: brandColor,
        textColor: '#ffffff',
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 75 },
        2: { cellWidth: 22 },
        3: { cellWidth: 20 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        drawFooter(doc.getCurrentPageInfo().pageNumber);
      }
    });

    doc.save(`reporte_articulos_asignados_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private aplicarFiltrosYOrden(): void {
    // 1. Filtrar por estado
    let articulosFiltrados = this.articulosFuente.filter((articulo) => {
      if (this.filtroEstado === 'todos') {
        return true;
      }

      if (this.filtroEstado === 'pendiente') {
        return articulo.estado === 'pendiente' || articulo.estado === 'en-proceso';
      }

      if (articulo.estado !== 'evaluado') {
        return false;
      }

      const rev = this.historialFuente.find((h) => h.articuloId === articulo.id);
      const decision = rev ? rev.decision : 'aceptar';

      if (this.filtroEstado === 'aceptado') {
        return decision === 'aceptar' || decision === 'ajustes';
      }

      if (this.filtroEstado === 'rechazado') {
        return decision === 'rechazar';
      }

      return true;
    });

    // 2. Filtrar por búsqueda
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      articulosFiltrados = articulosFiltrados.filter((articulo) => {
        return (
          articulo.codigo.toLowerCase().includes(query) ||
          articulo.titulo.toLowerCase().includes(query) ||
          articulo.resumen.toLowerCase().includes(query) ||
          articulo.tema.toLowerCase().includes(query)
        );
      });
    }

    // 3. Ordenar
    articulosFiltrados.sort((articuloA, articuloB) => {
      switch (this.ordenActual) {
        case 'llegada_asc':
          return this.obtenerTimestamp(articuloA.fechaAsignacion, Number.MAX_SAFE_INTEGER)
            - this.obtenerTimestamp(articuloB.fechaAsignacion, Number.MAX_SAFE_INTEGER);
        case 'vence_asc':
          return this.obtenerTimestamp(articuloA.fechaLimite, Number.MAX_SAFE_INTEGER)
            - this.obtenerTimestamp(articuloB.fechaLimite, Number.MAX_SAFE_INTEGER);
        case 'vence_desc':
          return this.obtenerTimestamp(articuloB.fechaLimite, 0)
            - this.obtenerTimestamp(articuloA.fechaLimite, 0);
        case 'llegada_desc':
        default:
          return this.obtenerTimestamp(articuloB.fechaAsignacion, 0)
            - this.obtenerTimestamp(articuloA.fechaAsignacion, 0);
      }
    });

    this.articulos = articulosFiltrados;
  }

  private esOrdenTabla(valor: string): valor is OrdenTabla {
    return this.opcionesOrden.some((opcion) => opcion.valor === valor);
  }

  private obtenerTimestamp(fecha: string | null, fallback: number): number {
    const fechaValida = this.obtenerFechaValida(fecha);
    return fechaValida ? fechaValida.getTime() : fallback;
  }

  private obtenerFechaValida(fecha: string | null): Date | null {
    if (!fecha) {
      return null;
    }

    const fechaParseada = new Date(fecha);
    if (Number.isNaN(fechaParseada.getTime())) {
      return null;
    }

    return fechaParseada;
  }
}
