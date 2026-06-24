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

  readonly palette = [
    '#0f766e',
    '#2563eb',
    '#7c3aed',
    '#ea580c',
    '#0891b2',
    '#16a34a',
    '#d97706',
    '#db2777',
  ];

  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  // Nuevas propiedades para filtros y paginación de asignación por rol/usuario
  searchUserText = '';
  filterRole = '';
  currentRolePage = 1;
  rolePageSize = 10;

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  get kpis(): StatCard[] {
    if (!this.estadisticas) {
      return [];
    }

    return [
      {
        label: 'Artículos totales',
        value: String(this.estadisticas.totalArticulos),
        hint: 'Registro histórico del sistema',
      },
      {
        label: 'En publicación',
        value: String(this.estadisticas.articulosEnPublicacion),
        hint: 'Listos o próximos a salir',
      },
      {
        label: 'En proceso',
        value: String(this.estadisticas.articulosEnProceso),
        hint: 'Flujo editorial activo',
      },
      {
        label: 'Promedio autores',
        value: `${this.estadisticas.promedioAutores}`,
        hint: 'Autores por artículo',
      },
      {
        label: 'Promedio temas',
        value: `${this.estadisticas.promedioTemas}`,
        hint: 'Temas por artículo',
      },
      {
        label: 'Promedio días',
        value: `${this.estadisticas.promedioDiasDesdeEnvio}`,
        hint: 'Desde el primer envío',
      },
      {
        label: 'Graduados posgrado',
        value: String(this.totalUsuariosConPosgrado),
        hint: 'Con maestría o doctorado',
      },
      {
        label: 'Estudiantes posgrado',
        value: String(this.totalEstudiantesPosgrado),
        hint: 'Cursando actualmente',
      },
      {
        label: 'Profesionales',
        value: String(this.totalUsuariosConProfesion),
        hint: 'Con carrera registrada',
      },
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

  // Métodos de filtrado, búsqueda y formateo de roles
  onSearchUser(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchUserText = target.value ?? '';
    this.currentRolePage = 1;
  }

  onFilterRole(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filterRole = target.value ?? '';
    this.currentRolePage = 1;
  }

  formatRolLabel(rol: string): string {
    const mappings: Record<string, string> = {
      'admin': 'Administrador',
      'director': 'Director',
      'monitor': 'Monitor',
      'comite-editorial': 'Comité Editorial',
      'revisor': 'Revisor',
      'autor': 'Autor',
    };
    return mappings[rol] ?? rol;
  }

  calcularPorcentaje(asignados: number, evaluados: number): number {
    if (!asignados) return 0;
    return Math.round((evaluados / asignados) * 100);
  }

  calcularPorcentajeDemografica(cantidad: number, total: number): number {
    if (!total) return 0;
    return Math.round((cantidad / total) * 100);
  }

  get totalUsuariosConProfesion(): number {
    return this.estadisticas?.usuariosPorProfesion?.reduce((sum, item) => sum + item.cantidad, 0) ?? 0;
  }

  get totalUsuariosConPosgrado(): number {
    return this.estadisticas?.usuariosPorNivelPosgrado?.reduce((sum, item) => sum + item.cantidad, 0) ?? 0;
  }

  get totalEstudiantesPosgrado(): number {
    return this.estadisticas?.estudiantesPosgrado?.reduce((sum, item) => sum + item.cantidad, 0) ?? 0;
  }

  get filteredStatsRolesYUsuarios() {
    if (!this.estadisticas?.statsRolesYUsuarios) return [];

    return this.estadisticas.statsRolesYUsuarios.filter(item => {
      const matchSearch = !this.searchUserText ||
        item.nombre.toLowerCase().includes(this.searchUserText.toLowerCase());
      const matchRole = !this.filterRole || item.rol === this.filterRole;
      return matchSearch && matchRole;
    });
  }

  get paginatedStatsRolesYUsuarios() {
    const filtered = this.filteredStatsRolesYUsuarios;
    const start = (this.currentRolePage - 1) * this.rolePageSize;
    return filtered.slice(start, start + this.rolePageSize);
  }

  get totalRolePages(): number {
    return Math.ceil(this.filteredStatsRolesYUsuarios.length / this.rolePageSize) || 1;
  }

  nextRolePage(): void {
    if (this.currentRolePage < this.totalRolePages) {
      this.currentRolePage++;
    }
  }

  prevRolePage(): void {
    if (this.currentRolePage > 1) {
      this.currentRolePage--;
    }
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
          ['Generado', this.formatearFechaLarga(new Date()), 'Fecha de emisión'],
          ['Artículos totales', String(this.estadisticas.totalArticulos), 'Base histórica acumulada'],
          ['En publicación', String(this.estadisticas.articulosEnPublicacion), 'Listos para salir o en edición final'],
          ['En proceso', String(this.estadisticas.articulosEnProceso), 'Flujo editorial activo'],
          ['Promedio autores', `${this.estadisticas.promedioAutores}`, 'Autores por artículo'],
          ['Promedio temas', `${this.estadisticas.promedioTemas}`, 'Temas por artículo'],
          [
            'Promedio días desde envío',
            `${this.estadisticas.promedioDiasDesdeEnvio}`,
            'Tiempo promedio de gestión',
          ],
          ['Graduados posgrado', String(this.totalUsuariosConPosgrado), 'Usuarios con maestría o doctorado'],
          ['Estudiantes posgrado', String(this.totalEstudiantesPosgrado), 'Usuarios cursando posgrado actualmente'],
          ['Profesionales registrados', String(this.totalUsuariosConProfesion), 'Usuarios con profesión registrada'],
        ],
      },
      {
        titulo: 'Distribución por etapa',
        encabezados: ['Etapa', 'Cantidad', 'Participación'],
        filas: this.circuloEtapas.map((item) => [
          item.label,
          String(item.value),
          `${item.percentage}%`,
        ]),
      },
      {
        titulo: 'Distribución temática',
        encabezados: ['Tema', 'Cantidad', 'Participación'],
        filas: this.circuloTemas.map((item) => [
          item.label,
          String(item.value),
          `${item.percentage}%`,
        ]),
      },
      {
        titulo: 'Ingreso mensual',
        encabezados: ['Mes', 'Cantidad', 'Participación'],
        filas: this.mesesTop.map((item) => [item.label, String(item.value), `${item.percentage}%`]),
      },
      {
        titulo: 'Estadísticas por Rol y Usuario',
        encabezados: ['Usuario', 'Rol', 'Asignados / Enviados', 'Evaluados / Resueltos', 'Progreso'],
        filas: this.estadisticas.statsRolesYUsuarios.map((item) => [
          item.nombre,
          this.formatRolLabel(item.rol),
          item.rol === 'admin' || item.rol === 'director' || item.rol === 'monitor' ? '-' : String(item.asignados),
          String(item.evaluados),
          item.rol === 'admin' || item.rol === 'director' || item.rol === 'monitor' ? 'N/A' : `${this.calcularPorcentaje(item.asignados, item.evaluados)}%`,
        ]),
      },
      {
        titulo: 'Distribución de Profesiones de Usuarios',
        encabezados: ['Profesión', 'Usuarios', 'Porcentaje'],
        filas: this.estadisticas.usuariosPorProfesion.map((p) => [
          p.profesion,
          String(p.cantidad),
          `${this.calcularPorcentajeDemografica(p.cantidad, this.totalUsuariosConProfesion)}%`,
        ]),
      },
      {
        titulo: 'Nivel de Posgrado de Usuarios',
        encabezados: ['Nivel', 'Usuarios', 'Porcentaje'],
        filas: this.estadisticas.usuariosPorNivelPosgrado.map((n) => [
          n.nivel,
          String(n.cantidad),
          `${this.calcularPorcentajeDemografica(n.cantidad, this.totalUsuariosConPosgrado)}%`,
        ]),
      },
      {
        titulo: 'Estudiantes Activos de Posgrado',
        encabezados: ['Nivel / Programa', 'Estudiantes', 'Porcentaje'],
        filas: this.estadisticas.estudiantesPosgrado.map((e) => [
          e.nivel,
          String(e.cantidad),
          `${this.calcularPorcentajeDemografica(e.cantidad, this.totalEstudiantesPosgrado)}%`,
        ]),
      },
      {
        titulo: 'Últimos artículos registrados',
        encabezados: ['Código', 'Título', 'Etapa', 'Fecha de envío', 'Autores', 'Observaciones'],
        filas: this.estadisticas.articulosRecientes.map((articulo) => [
          articulo.codigo,
          articulo.titulo,
          articulo.etapa,
          articulo.fechaEnvio
            ? this.formatearFechaCorta(new Date(articulo.fechaEnvio))
            : 'Sin fecha',
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
      ['Tipo', 'Etiqueta / Nombre', 'Cantidad / Asignados', 'Participación / Evaluados'],
      ...this.circuloEtapas.map((item) => [
        'Etapa',
        item.label,
        String(item.value),
        `${item.percentage}%`,
      ]),
      ...this.circuloTemas.map((item) => [
        'Tema',
        item.label,
        String(item.value),
        `${item.percentage}%`,
      ]),
      ...this.mesesTop.map((item) => [
        'Mes',
        item.label,
        String(item.value),
        `${item.percentage}%`,
      ]),
      ['', '', '', ''],
      ['Estadísticas por Rol y Usuario', '', '', ''],
      ['Usuario', 'Rol', 'Asignados / Enviados', 'Evaluados / Resueltos'],
      ...this.estadisticas.statsRolesYUsuarios.map((item) => [
        item.nombre,
        this.formatRolLabel(item.rol),
        item.rol === 'admin' || item.rol === 'director' || item.rol === 'monitor' ? '-' : String(item.asignados),
        String(item.evaluados),
      ]),
      ['', '', '', ''],
      ['Distribución de Profesiones', '', '', ''],
      ['Profesión', 'Usuarios', 'Porcentaje', ''],
      ...this.estadisticas.usuariosPorProfesion.map((p) => [
        p.profesion,
        String(p.cantidad),
        `${this.calcularPorcentajeDemografica(p.cantidad, this.totalUsuariosConProfesion)}%`,
        '',
      ]),
      ['', '', '', ''],
      ['Nivel de Posgrado de Usuarios', '', '', ''],
      ['Nivel', 'Usuarios', 'Porcentaje', ''],
      ...this.estadisticas.usuariosPorNivelPosgrado.map((n) => [
        n.nivel,
        String(n.cantidad),
        `${this.calcularPorcentajeDemografica(n.cantidad, this.totalUsuariosConPosgrado)}%`,
        '',
      ]),
      ['', '', '', ''],
      ['Estudiantes Activos de Posgrado', '', '', ''],
      ['Programa / Nivel', 'Estudiantes', 'Porcentaje', ''],
      ...this.estadisticas.estudiantesPosgrado.map((e) => [
        e.nivel,
        String(e.cantidad),
        `${this.calcularPorcentajeDemografica(e.cantidad, this.totalEstudiantesPosgrado)}%`,
        '',
      ]),
      ['', '', '', ''],
      ['Resumen de actividad general', '', '', ''],
      ['Artículos totales', String(this.estadisticas.totalArticulos), '', ''],
      ['Artículos en publicación', String(this.estadisticas.articulosEnPublicacion), '', ''],
      ['Artículos en proceso', String(this.estadisticas.articulosEnProceso), '', ''],
      ['Graduados posgrado', String(this.totalUsuariosConPosgrado), '', ''],
      ['Estudiantes posgrado', String(this.totalEstudiantesPosgrado), '', ''],
      ['Profesionales registrados', String(this.totalUsuariosConProfesion), '', ''],
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
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
      doc.text(
        'Documento generado automáticamente por el sistema editorial Huellas.',
        14,
        pageHeight - 8,
      );
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

    let currentY = 34;

    const checkPageBreak = (yNeeded: number): void => {
      if (currentY + yNeeded > pageHeight - 20) {
        doc.addPage();
        drawHeader();
        currentY = 34;
      }
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
        [
          'En publicación',
          String(this.estadisticas.articulosEnPublicacion),
          'Listos o próximos a salir',
        ],
        ['En proceso', String(this.estadisticas.articulosEnProceso), 'Flujo editorial activo'],
        ['Promedio autores', `${this.estadisticas.promedioAutores}`, 'Autores por artículo'],
        ['Promedio temas', `${this.estadisticas.promedioTemas}`, 'Temas por artículo'],
        [
          'Promedio días desde envío',
          `${this.estadisticas.promedioDiasDesdeEnvio}`,
          'Tiempo medio de gestión',
        ],
        ['Graduados posgrado', String(this.totalUsuariosConPosgrado), 'Usuarios con maestría o doctorado'],
        ['Estudiantes posgrado', String(this.totalEstudiantesPosgrado), 'Usuarios cursando posgrado actualmente'],
        ['Profesionales registrados', String(this.totalUsuariosConProfesion), 'Usuarios con profesión registrada'],
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

    currentY =
      (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 54;
    currentY += 8;

    checkPageBreak(30);
    currentY = addSectionTitle(
      'Distribución por etapa',
      'Participación de los artículos por fase editorial.',
      currentY,
    );
    autoTable(doc, {
      startY: currentY,
      head: [['Etapa', 'Cantidad', 'Participación']],
      body: this.circuloEtapas.map((item) => [
        item.label,
        String(item.value),
        `${item.percentage}%`,
      ]),
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

    currentY =
      (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? currentY;
    currentY += 8;

    checkPageBreak(30);
    currentY = addSectionTitle(
      'Distribución temática',
      'Temas con mayor presencia en el sistema.',
      currentY,
    );
    autoTable(doc, {
      startY: currentY,
      head: [['Tema', 'Cantidad', 'Participación']],
      body: this.circuloTemas.map((item) => [
        item.label,
        String(item.value),
        `${item.percentage}%`,
      ]),
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

    currentY =
      (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? currentY;
    currentY += 8;

    checkPageBreak(30);
    currentY = addSectionTitle(
      'Ingreso mensual',
      'Volumen de artículos por mes de registro.',
      currentY,
    );
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

    // NUEVA TABLA: ESTADÍSTICAS POR ROL Y USUARIO
    currentY =
      (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? currentY;
    currentY += 8;

    checkPageBreak(40);
    currentY = addSectionTitle(
      'Estadísticas por Rol y Usuario',
      'Artículos asignados y evaluados por cada usuario según su rol.',
      currentY,
    );
    autoTable(doc, {
      startY: currentY,
      head: [['Usuario', 'Rol', 'Asignados / Enviados', 'Evaluados / Resueltos', 'Progreso']],
      body: this.estadisticas.statsRolesYUsuarios.map((item) => [
        item.nombre,
        this.formatRolLabel(item.rol),
        item.rol === 'admin' || item.rol === 'director' || item.rol === 'monitor' ? '-' : String(item.asignados),
        String(item.evaluados),
        item.rol === 'admin' || item.rol === 'director' || item.rol === 'monitor' ? 'N/A' : `${this.calcularPorcentaje(item.asignados, item.evaluados)}%`,
      ]),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2 },
      headStyles: { fillColor: brand, textColor: '#ffffff', fontStyle: 'bold' },
      alternateRowStyles: { fillColor: '#f8fbfc' },
      margin: { left: 14, right: 14 },
      didDrawPage: () => {
        drawHeader();
        drawFooter(doc.getCurrentPageInfo().pageNumber);
      },
    });

    // NUEVA TABLA: DISTRIBUCIÓN DE PROFESIONES
    currentY =
      (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? currentY;
    currentY += 8;

    checkPageBreak(40);
    currentY = addSectionTitle(
      'Distribución de Profesiones de Usuarios',
      'Cantidad y porcentaje de usuarios por profesión.',
      currentY,
    );
    autoTable(doc, {
      startY: currentY,
      head: [['Profesión', 'Usuarios', 'Porcentaje']],
      body: this.estadisticas.usuariosPorProfesion.map((p) => [
        p.profesion,
        String(p.cantidad),
        `${this.calcularPorcentajeDemografica(p.cantidad, this.totalUsuariosConProfesion)}%`,
      ]),
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

    // NUEVA TABLA: NIVELES DE POSGRADO
    currentY =
      (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? currentY;
    currentY += 8;

    checkPageBreak(40);
    currentY = addSectionTitle(
      'Nivel de Posgrado de Usuarios',
      'Títulos de posgrado obtenidos por los usuarios registrados.',
      currentY,
    );
    autoTable(doc, {
      startY: currentY,
      head: [['Nivel de Posgrado', 'Usuarios', 'Porcentaje']],
      body: this.estadisticas.usuariosPorNivelPosgrado.map((n) => [
        n.nivel,
        String(n.cantidad),
        `${this.calcularPorcentajeDemografica(n.cantidad, this.totalUsuariosConPosgrado)}%`,
      ]),
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

    // NUEVA TABLA: ESTUDIANTES DE POSGRADO
    currentY =
      (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? currentY;
    currentY += 8;

    checkPageBreak(40);
    currentY = addSectionTitle(
      'Estudiantes Activos de Posgrado',
      'Usuarios que cursan actualmente estudios de posgrado.',
      currentY,
    );
    autoTable(doc, {
      startY: currentY,
      head: [['Nivel / Programa', 'Estudiantes', 'Porcentaje']],
      body: this.estadisticas.estudiantesPosgrado.map((e) => [
        e.nivel,
        String(e.cantidad),
        `${this.calcularPorcentajeDemografica(e.cantidad, this.totalEstudiantesPosgrado)}%`,
      ]),
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

    currentY =
      (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? currentY;
    currentY += 8;

    checkPageBreak(40);
    currentY = addSectionTitle(
      'Últimos artículos registrados',
      'Detalle operativo de los registros más recientes.',
      currentY,
    );
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
    this.currentPage = 1; // Reiniciar página al cargar nuevos datos

    this.articulosService.getEstadisticasGeneralesArticulos().subscribe({
      next: (estadisticas) => {
        this.estadisticas = estadisticas;
        this.totalPages = Math.ceil(estadisticas.articulosRecientes.length / this.pageSize);
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
    const filas = [[seccion.titulo], seccion.encabezados, ...seccion.filas];

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
    }).format(fecha);
  }

  get paginatedArticulosRecientes() {
    if (!this.estadisticas?.articulosRecientes) return [];
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.estadisticas.articulosRecientes.slice(start, end);
  }

  goToPage(page: number | string) {
    const pageNumber = typeof page === 'string' ? parseInt(page, 10) : page;
    if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > this.totalPages) return;
    this.currentPage = pageNumber;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  getPageNumbers(): (number | string)[] {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number;

    for (let i = 1; i <= this.totalPages; i++) {
      if (
        i === 1 ||
        i === this.totalPages ||
        (i >= this.currentPage - delta && i <= this.currentPage + delta)
      ) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });
    return rangeWithDots;
  }

  getEtapaClase(etapa: string): string {
    if (!etapa) return '';

    const normalizada = etapa
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');

    if (normalizada.includes('revision-preliminar')) return 'stage--revision-preliminar';
    if (normalizada.includes('turnitin')) return 'stage--turnitin';
    if (normalizada.includes('comite-editorial')) return 'stage--comite-editorial';
    if (normalizada.includes('revision-pares')) return 'stage--revision-pares';
    if (normalizada.includes('certificacion')) return 'stage--certificacion';
    if (normalizada.includes('revision-final')) return 'stage--revision-final';
    if (normalizada.includes('publicacion')) return 'stage--publicacion';

    return '';
  }
}
