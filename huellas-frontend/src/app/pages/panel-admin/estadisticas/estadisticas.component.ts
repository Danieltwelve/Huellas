import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ArticulosService,
  EstadisticasGeneralesArticulosBackend,
} from '../../../core/articulos/articulos.service';

interface StatCard {
  label: string;
  value: string;
  hint: string;
}

interface CircularChartItem {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface ReporteSectionCsv {
  titulo: string;
  encabezados: string[];
  filas: Array<Array<string | number>>;
}

@Component({
  selector: 'app-estadisticas-panel-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.css',
})
export class EstadisticasComponent implements OnInit {
  private readonly articulosService = inject(ArticulosService);

  loading = true;
  error: string | null = null;
  estadisticas: EstadisticasGeneralesArticulosBackend | null = null;

  readonly palette = ['#0f766e', '#2563eb', '#7c3aed', '#ea580c', '#0891b2', '#16a34a', '#d97706', '#db2777'];

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  get kpis(): StatCard[] {
    if (!this.estadisticas) {
      return [];
    }

    return [
      { label: 'Artículos totales', value: String(this.estadisticas.totalArticulos), hint: 'Registro histórico del sistema' },
      { label: 'En publicación', value: String(this.estadisticas.articulosEnPublicacion), hint: 'Listos o próximos a salir' },
      { label: 'En proceso', value: String(this.estadisticas.articulosEnProceso), hint: 'Flujo editorial activo' },
      { label: 'Promedio autores', value: `${this.estadisticas.promedioAutores}`, hint: 'Autores por artículo' },
      { label: 'Promedio temas', value: `${this.estadisticas.promedioTemas}`, hint: 'Temas por artículo' },
      { label: 'Promedio días', value: `${this.estadisticas.promedioDiasDesdeEnvio}`, hint: 'Desde el primer envío' },
    ];
  }

  get circuloEtapas(): CircularChartItem[] {
    return this.construirCirculo(this.estadisticas?.etapaDistribucion ?? [], (item) => item.etapa);
  }

  get circuloTemas(): CircularChartItem[] {
    return this.construirCirculo(this.estadisticas?.temaDistribucion ?? [], (item) => item.tema);
  }

  get mesesTop(): CircularChartItem[] {
    return this.construirCirculo(this.estadisticas?.mensualDistribucion ?? [], (item) => item.mes);
  }

  get donutEtapasStyle(): string {
    return this.crearConicGradient(this.circuloEtapas);
  }

  get donutTemasStyle(): string {
    return this.crearConicGradient(this.circuloTemas);
  }

  get donutMesesStyle(): string {
    return this.crearConicGradient(this.mesesTop);
  }

  descargarReporteEjecutivoCsv(): void {
    if (!this.estadisticas) {
      return;
    }

    const secciones: ReporteSectionCsv[] = [
      {
        titulo: 'Resumen ejecutivo',
        encabezados: ['Métrica', 'Valor', 'Detalle'],
        filas: [
          ['Generado', this.formatearFechaLarga(new Date()), 'Fecha y hora de emisión'],
          ['Artículos totales', String(this.estadisticas.totalArticulos), 'Base histórica acumulada'],
          ['En publicación', String(this.estadisticas.articulosEnPublicacion), 'Listos para salir o en edición final'],
          ['En proceso', String(this.estadisticas.articulosEnProceso), 'Flujo editorial activo'],
          ['Promedio autores', `${this.estadisticas.promedioAutores}`, 'Autores por artículo'],
          ['Promedio temas', `${this.estadisticas.promedioTemas}`, 'Temas por artículo'],
          ['Promedio días desde envío', `${this.estadisticas.promedioDiasDesdeEnvio}`, 'Tiempo promedio de gestión'],
        ],
      },
      {
        titulo: 'Distribución por etapa',
        encabezados: ['Etapa', 'Cantidad', 'Participación'],
        filas: this.circuloEtapas.map((item) => [item.label, String(item.value), `${item.percentage}%`]),
      },
      {
        titulo: 'Distribución temática',
        encabezados: ['Tema', 'Cantidad', 'Participación'],
        filas: this.circuloTemas.map((item) => [item.label, String(item.value), `${item.percentage}%`]),
      },
      {
        titulo: 'Ingreso mensual',
        encabezados: ['Mes', 'Cantidad', 'Participación'],
        filas: this.mesesTop.map((item) => [item.label, String(item.value), `${item.percentage}%`]),
      },
      {
        titulo: 'Últimos artículos registrados',
        encabezados: ['Código', 'Título', 'Etapa', 'Fecha de envío', 'Autores', 'Observaciones'],
        filas: this.estadisticas.articulosRecientes.map((articulo) => [
          articulo.codigo,
          articulo.titulo,
          articulo.etapa,
          articulo.fechaEnvio ? this.formatearFechaCorta(new Date(articulo.fechaEnvio)) : 'Sin fecha',
          articulo.autores,
          articulo.observaciones,
        ]),
      },
    ];

    const csv = secciones.map((seccion) => this.serializarSeccionCsv(seccion)).join('\n\n');
    this.descargarTexto(csv, 'reporte-estadistico-ejecutivo', 'text/csv;charset=utf-8;');
  }

  descargarReporteTablasCsv(): void {
    if (!this.estadisticas) {
      return;
    }

    const rows = [
      ['Tipo', 'Etiqueta', 'Cantidad', 'Participación'],
      ...this.circuloEtapas.map((item) => ['Etapa', item.label, String(item.value), `${item.percentage}%`]),
      ...this.circuloTemas.map((item) => ['Tema', item.label, String(item.value), `${item.percentage}%`]),
      ...this.mesesTop.map((item) => ['Mes', item.label, String(item.value), `${item.percentage}%`]),
      ['', '', '', ''],
      ['Resumen de actividad', '', '', ''],
      ['Artículos totales', String(this.estadisticas.totalArticulos), '', ''],
      ['Artículos en publicación', String(this.estadisticas.articulosEnPublicacion), '', ''],
      ['Artículos en proceso', String(this.estadisticas.articulosEnProceso), '', ''],
    ];

    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    this.descargarTexto(csv, 'reporte-tablas-estadisticas', 'text/csv;charset=utf-8;');
  }

  descargarReportePdf(): void {
    if (!this.estadisticas) {
      return;
    }

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const brand = '#0f766e';
    const accent = '#0d9488';
    const textDark = '#0f172a';
    const textMuted = '#64748b';
    const generatedAt = this.formatearFechaLarga(new Date());

    doc.setProperties({
      title: 'Reporte estadístico ejecutivo - Revista Huellas',
      subject: 'Informe de estadísticas editoriales',
      author: 'Revista Huellas',
      creator: 'Revista Huellas',
    });

    const drawHeader = (): void => {
      doc.setFillColor(15, 118, 110);
      doc.rect(0, 0, pageWidth, 26, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('REVISTA HUELLAS', 14, 11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Reporte estadístico ejecutivo del flujo editorial', 14, 17);
      doc.setFontSize(8);
      doc.text(`Generado: ${generatedAt}`, 14, 22);
    };

    const drawFooter = (pageNumber: number): void => {
      doc.setDrawColor(224, 231, 240);
      doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text('Documento generado automáticamente por el sistema editorial Huellas.', 14, pageHeight - 8);
      doc.text(`Página ${pageNumber}`, pageWidth - 28, pageHeight - 8);
    };

    const addSectionTitle = (title: string, subtitle: string, y: number): number => {
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(title, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, 14, y + 5);
      return y + 8;
    };

    drawHeader();

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Resumen ejecutivo', 14, 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Síntesis de indicadores clave del comportamiento editorial.', 14, 39);

    autoTable(doc, {
      startY: 44,
      head: [['Indicador', 'Valor', 'Detalle']],
      body: [
        ['Artículos totales', String(this.estadisticas.totalArticulos), 'Base histórica acumulada'],
        ['En publicación', String(this.estadisticas.articulosEnPublicacion), 'Listos o próximos a salir'],
        ['En proceso', String(this.estadisticas.articulosEnProceso), 'Flujo editorial activo'],
        ['Promedio autores', `${this.estadisticas.promedioAutores}`, 'Autores por artículo'],
        ['Promedio temas', `${this.estadisticas.promedioTemas}`, 'Temas por artículo'],
        ['Promedio días desde envío', `${this.estadisticas.promedioDiasDesdeEnvio}`, 'Tiempo medio de gestión'],
      ],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: textDark,
        lineColor: '#d9e2ec',
        lineWidth: 0.2,
        cellPadding: 2.6,
      },
      headStyles: {
        fillColor: brand,
        textColor: '#ffffff',
        fontStyle: 'bold',
      },
      columnStyles: {
        1: { halign: 'center' },
        2: { textColor: textMuted },
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        drawHeader();
        drawFooter(doc.getCurrentPageInfo().pageNumber);
      },
    });

    let currentY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 54;
    currentY += 8;

    currentY = addSectionTitle('Distribución por etapa', 'Participación de los artículos por fase editorial.', currentY);
    autoTable(doc, {
      startY: currentY,
      head: [['Etapa', 'Cantidad', 'Participación']],
      body: this.circuloEtapas.map((item) => [item.label, String(item.value), `${item.percentage}%`]),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: accent, textColor: '#ffffff', fontStyle: 'bold' },
      alternateRowStyles: { fillColor: '#f8fbfc' },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        drawHeader();
        drawFooter(doc.getCurrentPageInfo().pageNumber);
      },
    });

    currentY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? currentY;
    currentY += 8;

    currentY = addSectionTitle('Distribución temática', 'Temas con mayor presencia en el sistema.', currentY);
    autoTable(doc, {
      startY: currentY,
      head: [['Tema', 'Cantidad', 'Participación']],
      body: this.circuloTemas.map((item) => [item.label, String(item.value), `${item.percentage}%`]),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: brand, textColor: '#ffffff', fontStyle: 'bold' },
      alternateRowStyles: { fillColor: '#f8fbfc' },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        drawHeader();
        drawFooter(doc.getCurrentPageInfo().pageNumber);
      },
    });

    currentY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? currentY;
    currentY += 8;

    currentY = addSectionTitle('Ingreso mensual', 'Volumen de artículos por mes de registro.', currentY);
    autoTable(doc, {
      startY: currentY,
      head: [['Mes', 'Cantidad', 'Participación']],
      body: this.mesesTop.map((item) => [item.label, String(item.value), `${item.percentage}%`]),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: accent, textColor: '#ffffff', fontStyle: 'bold' },
      alternateRowStyles: { fillColor: '#f8fbfc' },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        drawHeader();
        drawFooter(doc.getCurrentPageInfo().pageNumber);
      },
    });

    currentY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? currentY;
    currentY += 8;

    currentY = addSectionTitle('Últimos artículos registrados', 'Detalle operativo de los registros más recientes.', currentY);
    autoTable(doc, {
      startY: currentY,
      head: [['Código', 'Título', 'Etapa', 'Fecha de envío', 'Autores', 'Observaciones']],
      body: this.estadisticas.articulosRecientes.map((articulo) => [
        articulo.codigo,
        articulo.titulo,
        articulo.etapa,
        articulo.fechaEnvio ? this.formatearFechaCorta(new Date(articulo.fechaEnvio)) : 'Sin fecha',
        articulo.autores,
        articulo.observaciones,
      ]),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8.2, cellPadding: 2.2, valign: 'top' },
      headStyles: { fillColor: textDark, textColor: '#ffffff', fontStyle: 'bold' },
      alternateRowStyles: { fillColor: '#fafcff' },
      margin: { left: 14, right: 14, bottom: 16 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 48 },
        2: { cellWidth: 24 },
        3: { cellWidth: 26 },
        4: { cellWidth: 22 },
        5: { cellWidth: 42 },
      },
      didDrawPage: () => {
        drawHeader();
        drawFooter(doc.getCurrentPageInfo().pageNumber);
      },
    });

    doc.save(`reporte-estadistico-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private cargarEstadisticas(): void {
    this.loading = true;
    this.error = null;

    this.articulosService.getEstadisticasGeneralesArticulos().subscribe({
      next: (estadisticas) => {
        this.estadisticas = estadisticas;
        this.loading = false;
      },
      error: (error) => {
        this.estadisticas = null;
        this.loading = false;
        this.error = error?.error?.message ?? 'No fue posible cargar las estadísticas.';
      },
    });
  }

  private construirCirculo<T extends { cantidad: number }>(
    items: T[],
    getLabel: (item: T) => string,
  ): CircularChartItem[] {
    const total = items.reduce((suma, item) => suma + item.cantidad, 0) || 1;

    return items.map((item, index) => ({
      label: getLabel(item),
      value: item.cantidad,
      percentage: Number(((item.cantidad / total) * 100).toFixed(1)),
      color: this.palette[index % this.palette.length],
    }));
  }

  private crearConicGradient(items: CircularChartItem[]): string {
    if (!items.length) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)';
    }

    let acumulado = 0;
    const stops = items.map((item) => {
      const start = acumulado;
      acumulado += item.percentage * 3.6;
      return `${item.color} ${start}deg ${acumulado}deg`;
    });

    return `conic-gradient(${stops.join(', ')})`;
  }

  private descargarArchivo(contenido: string, nombreBase: string): void {
    this.descargarTexto(contenido, nombreBase, 'text/csv;charset=utf-8;');
  }

  private descargarTexto(contenido: string, nombreBase: string, mimeType: string): void {
    const blob = new Blob([contenido], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nombreBase}-${new Date().toISOString().slice(0, 10)}.${mimeType.includes('pdf') ? 'pdf' : 'csv'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private serializarSeccionCsv(seccion: ReporteSectionCsv): string {
    const filas = [
      [seccion.titulo],
      seccion.encabezados,
      ...seccion.filas,
    ];

    return filas
      .map((fila) => fila.map((valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  private formatearFechaCorta(fecha: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(fecha);
  }

  private formatearFechaLarga(fecha: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(fecha);
  }
}