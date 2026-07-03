import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ArticuloFlujo,
  ArticulosService,
  ObservacionBackend,
  CertificadoArticuloBackend,
} from '../../../../core/articulos/articulos.service';
import { ActivatedRoute, Router } from '@angular/router';
import { normalizarNombreArchivo } from '../../../../core/utils/filename.utils';
import { AuthService } from '../../../../core/auth/auth.service';
import { UsersService, UsuarioBackend } from '../../../../core/users/users.service';
import { RevisionPares } from './revision-pares/revision-pares';
import { EdicionesRevistaService } from '../../../../core/ediciones-revista/ediciones.revista.service';
import { ResumenAutor } from './resumen-autor/resumen-autor';
import { Publicacion } from './publicacion/publicacion';

interface EtapaFlujo {
  id: number;
  titulo: string;
  activa: boolean;
}

interface ArchivoRegistro {
  nombre: string;
  path: string;
}

interface RegistroFlujo {
  id: number;
  usuarioId?: number;
  etapaId?: number;
  fechaOrden: number;
  fecha: string;
  autor: string;
  rol: string;
  asunto: string;
  comentario?: string;
  archivos?: ArchivoRegistro[];
  esCorreccionAutor?: boolean;
  correccionAceptada?: boolean;
  puedeAceptarCorreccion?: boolean;
  expandido?: boolean;
}

interface EtapaTimeline {
  id: number;
  titulo: string;
  estado: 'completada' | 'actual' | 'pendiente';
  fecha: string;
  descripcion: string;
}

@Component({
  selector: 'app-flujo-trabajo-articulo',
  imports: [CommonModule, FormsModule, RevisionPares, ResumenAutor, Publicacion],
  templateUrl: './flujo-trabajo-articulo.html',
  styleUrl: './flujo-trabajo-articulo.css',
  standalone: true,
})
export class FlujoTrabajoArticulo {
  private static readonly MAX_TURNITIN_FILE_SIZE_BYTES = 10 * 1024 * 1024;
  private static readonly MODAL_EXITO_MOVER_AUTOCLOSE_MS = 3500;
  private readonly route = inject(ActivatedRoute);
  private readonly articulosService = inject(ArticulosService);
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly edicionesService = inject(EdicionesRevistaService);
  private readonly autoRefreshMs = 12000;
  articuloIdActual: number | null = null;
  private autoRefreshSubscription: Subscription | null = null;
  private modalExitoMoverTimeoutId: ReturnType<typeof setTimeout> | null = null;

  checklistRevisionFinal = {
    ajustesRevisores: false,
    cumpleNormativas: false,
    resumenYSecciones: false,
    numeroPaginas: false,
    normasFormato: false,
    referenciasBibliograficas: false,
    redaccionOrtografia: false,
    metadatosInglesEspanol: false,
  };
  guardandoChecklist = false;
  decisionRevisionFinal: 'aceptar' | 'rechazar' | null = null;
  comentariosRevisionFinal = '';
  procesandoRevisionFinal = false;

  private static readonly ETAPA_REVISION_PRELIMINAR = 1;
  private static readonly ETAPA_COMITE_EDITORIAL = 6;
  private static readonly ETAPA_REVISION_PARES = 4;
  private static readonly ETAPA_CERTIFICACION = 8;

  articulo: ArticuloFlujo | null = null;
  loading = true;
  error: string | null = null;
  accionExitosa: string | null = null;
  accionError: string | null = null;
  aceptandoCorreccionIds = new Set<number>();

  guardandoObservacion = false;
  moviendoEtapa = false;
  evaluandoTurnitin = false;
  porcentajeTurnitin: number | null = null;
  observacionTurnitin = '';
  archivoTurnitin: File | null = null;
  nombreArchivoTurnitin = '';

  mostrarModalConfirmacionProrrogaComite = false;
  decisionProrrogaComiteConfirmar: 'aceptar' | 'rechazar' | null = null;
  resolviendoProrrogaComite = false;

  mostrarModalConfirmacionProrrogaRevisor = false;
  decisionProrrogaRevisorConfirmar: 'aceptar' | 'rechazar' | null = null;
  resolviendoProrrogaRevisor = false;

  mostrarModalConfirmacionProrrogaCorreccion = false;
  decisionProrrogaCorreccionConfirmar: 'aceptar' | 'rechazar' | null = null;
  archivoCertificacion: File | null = null;
  nombreArchivoCertificacion = '';
  subiendoCertificacion = false;
  certificadoPublicacionCargado: CertificadoArticuloBackend | null = null;
  decisionTurnitin: 'aceptado' | 'rechazado_similitud' | 'solicitar_cambios' | null = null;
  evaluandoComite = false;
  decisionComite: 'aceptar' | 'rechazar' = 'aceptar';
  observacionComite = '';
  archivoComite: File | null = null;
  nombreArchivoComite = '';
  committeeMembers: UsuarioBackend[] = [];
  committeeMemberSeleccionadoId: number | null = null;
  asignandoComite = false;

  arrastrandoArchivoTurnitin = false;
  progresoTurnitin = 0;
  arrastrandoArchivoComite = false;
  progresoComite = 0;
  arrastrandoArchivoCertificacion = false;
  progresoCertificacion = 0;

  asuntoObservacion = '';
  comentarioObservacion = '';
  archivoObservacion: File | null = null;
  nombreArchivoObservacion = '';
  etapaMoverSeleccionadaId: number | null = null;
  mostrarModalConfirmacionMover = false;
  etapaDestinoConfirmacion: EtapaFlujo | null = null;
  mostrarModalExitoMover = false;
  mensajeExitoMover = '';
  mostrarModalConfirmacionAsignacion = false;
  miembroComiteConfirmacion: UsuarioBackend | null = null;
  mostrarModalExitoAsignacion = false;
  mensajeExitoAsignacion = '';
  mostrarModalConfirmacionTurnitin = false;
  mostrarModalExitoTurnitin = false;
  mensajeExitoTurnitin = '';
  tituloModalExito = 'Proceso completado';
  badgeModalExito = 'Proceso completado';
  mostrarModalErrorTurnitin = false;
  mensajeErrorTurnitin: string | null = null;
  mostrarModalConfirmacionCorreccion = false;
  mostrarModalConfirmacionRechazoCorreccion = false;
  mostrarModalConfirmacionCertificado = false;
  mostrarModalConfirmacionRevisionFinal = false;
  registroCorreccionConfirmacion: RegistroFlujo | null = null;
  registroCorreccionRechazoConfirmacion: RegistroFlujo | null = null;
  comentarioAceptacionCorreccion = '';
  comentarioRechazoCorreccion = '';
  rechazandoCorreccionIds = new Set<number>();

  rutaEditorialExpandida = false;

  tituloArticulo = 'Cargando...';

  private readonly ASUNTO_EVALUACION_TURNITIN_CORRECCION =
    'Evaluación de Turnitin: REQUIERE CORRECCIÓN';

  private readonly ordenEtapasFlujo: number[] = [1, 6, 3, 4, 9, 8, 5];

  readonly etapasDisponibles: EtapaFlujo[] = [
    { id: 1, titulo: 'Revisión Preliminar', activa: false },
    { id: 6, titulo: 'Comité Editorial', activa: false },
    { id: 3, titulo: 'Turnitin', activa: false },
    { id: 4, titulo: 'Revisión por pares', activa: false },
    { id: 9, titulo: 'Revisión final', activa: false },
    { id: 8, titulo: 'Certificación', activa: false },
    { id: 5, titulo: 'Publicación', activa: false },
  ];

  private readonly etapasDescripciones: Map<number, string> = new Map([
    [1, 'Validación editorial inicial del envío'],
    [6, 'Revisión del artículo por un miembro del Comité Editorial'],
    [3, 'Validación de originalidad y similitud (30% o menos)'],
    [4, 'Evaluación por revisores académicos'],
    [9, 'Revisión final de consistencia antes de publicar'],
    [8, 'Verificación de cumplimiento documental y editorial'],
    [5, 'Preparación y salida en volumen activo'],
  ]);

  etapas: EtapaFlujo[] = [...this.etapasDisponibles];

  historialObservaciones: RegistroFlujo[] = [];

  readonly rubricaItems: string[] = [
    'Originalidad y aporte científico',
    'Coherencia metodológica',
    'Rigor en resultados y discusión',
    'Cumplimiento de normas editoriales',
    'Pertinencia temática para la revista',
  ];

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.articuloIdActual = +id;
        this.cargarArticulo(this.articuloIdActual);
        this.iniciarAutoRefresh();
      } else {
        this.error = 'No se encontró el ID del artículo';
        this.loading = false;
      }
    });

    this.loadCommitteeMembers();
  }

  ngOnDestroy(): void {
    this.limpiarTemporizadorModalExitoMover();
    this.detenerAutoRefresh();
  }

  volverAlListado(): void {
    // Ir al listado de artículos del panel de administración
    this.router.navigate(['/articulos']);
  }

  exportarHistorialPdf(): void {
    if (!this.articulo) {
      return;
    }

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const brand = '#0f766e';
    const accent = '#0d9488';
    const textDark = '#0f172a';
    const textMuted = '#64748b';
    const generatedAt = new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());

    doc.setProperties({
      title: `Historial de Artículo - ${this.articulo.codigo}`,
      subject: 'Historial y bitácora del flujo editorial',
      author: 'Revista Huellas',
    });

    const drawHeader = (): void => {
      doc.setFillColor(15, 118, 110);
      doc.rect(0, 0, pageWidth, 26, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('REVISTA HUELLAS - BITÁCORA EDITORIAL', 14, 11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Código del artículo: ${this.articulo?.codigo ?? 'S/N'}`, 14, 17);
      doc.setFontSize(8);
      doc.text(`Reporte generado: ${generatedAt}`, 14, 22);
    };

    const drawFooter = (pageNumber: number): void => {
      doc.setDrawColor(224, 231, 240);
      doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text(
        'Este documento es una copia oficial de la bitácora del proceso editorial de la Revista Huellas.',
        14,
        pageHeight - 8,
      );
      doc.text(`Página ${pageNumber}`, pageWidth - 28, pageHeight - 8);
    };

    drawHeader();
    drawFooter(1);

    // Context metadata
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Resumen del Manuscrito', 14, 34);

    autoTable(doc, {
      startY: 38,
      head: [['Campo', 'Detalle']],
      body: [
        ['Título', this.articulo.titulo || 'Sin título'],
        ['Código', this.articulo.codigo || 'Sin código asignado'],
        ['Etapa Actual', this.articulo.etapaActual?.nombre || 'Desconocida'],
        ['Temas', (this.articulo.temas || []).join(', ') || 'Sin especificar'],
        ['Palabras Clave', (this.articulo.palabrasClave || []).join(', ') || 'Sin especificar'],
        ['Autores', (this.articulo.autores || []).map(a => `${a.nombre} (${a.email})`).join(', ') || 'Sin autores'],
        ['Fecha de Envío', this.articulo.fechaEnvio ? this.formatearFecha(this.articulo.fechaEnvio) : 'Sin fecha'],
      ],
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.2, textColor: textDark, lineColor: '#cbd5e1' },
      headStyles: { fillColor: brand, textColor: '#ffffff' },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } },
      margin: { left: 14, right: 14 }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Historial Cronológico de Cambios y Observaciones', 14, currentY);
    currentY += 5;

    const bodyHistorial = this.historialObservaciones.map((obs) => [
      obs.fecha,
      obs.autor,
      obs.rol,
      obs.asunto,
      this.formatearComentario(obs.comentario) || 'Sin comentarios adicionales.'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Fecha', 'Autor', 'Rol', 'Acción / Asunto', 'Comentarios']],
      body: bodyHistorial,
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.5, textColor: textDark, valign: 'top' },
      headStyles: { fillColor: accent, textColor: '#ffffff' },
      alternateRowStyles: { fillColor: '#f8fbfc' },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 26 },
        2: { cellWidth: 26 },
        3: { cellWidth: 42 },
        4: { cellWidth: 68 }
      },
      margin: { left: 14, right: 14, bottom: 20 },
      didDrawPage: (data) => {
        drawHeader();
        drawFooter(doc.getCurrentPageInfo().pageNumber);
      }
    });

    doc.save(`historial-articulo-${this.articulo.codigo || this.articulo.id}.pdf`);
  }

  toggleRutaEditorial(): void {
    this.rutaEditorialExpandida = !this.rutaEditorialExpandida;
  }

  private iniciarAutoRefresh(): void {
    this.detenerAutoRefresh();

    this.autoRefreshSubscription = interval(this.autoRefreshMs).subscribe(() => {
      this.recargarArticuloSilencioso();
    });
  }

  private detenerAutoRefresh(): void {
    this.autoRefreshSubscription?.unsubscribe();
    this.autoRefreshSubscription = null;
  }

  private recargarArticuloSilencioso(): void {
    if (!this.articuloIdActual || this.debePausarAutoRefresh) {
      return;
    }

    this.articulosService.getArticuloFlujo(this.articuloIdActual).subscribe({
      next: (data) => {
        this.articulo = data;
        this.tituloArticulo = `${data.codigo} - ${data.titulo}`;
        this.actualizarEtapaActual(data.etapaActual.id);
        this.etapaMoverSeleccionadaId = this.etapaSiguientePermitida?.id ?? null;
        this.committeeMemberSeleccionadoId =
          data.comiteEditorial?.id ?? this.committeeMemberSeleccionadoId;
        this.historialObservaciones = this.mapearObservacionesAHistorial(data.observaciones);
        if (data.etapaActual.id !== 9) {
          this.mapearChecklistYMetadata(data);
        }
        this.cargarCertificadoPublicacion(data.id);
      },
      error: () => {
        // En auto-refresh silencioso ignoramos errores temporales para no interrumpir la vista.
      },
    });
  }

  private loadCommitteeMembers(): void {
    if (!this.authService.hasAnyRole(['admin', 'director', 'monitor'])) {
      return;
    }

    this.usersService.getCommitteeMembers().subscribe({
      next: (users) => {
        this.committeeMembers = users.filter((user) => user.estado_cuenta === true);
        this.committeeMemberSeleccionadoId =
          this.articulo?.comiteEditorial?.id ?? this.committeeMembers[0]?.id ?? null;
      },
      error: () => {
        this.committeeMembers = [];
      },
    });
  }

  cargarArticulo(id: number, alCompletar?: () => void): void {
    this.loading = true;
    this.articulosService.getArticuloFlujo(id).subscribe({
      next: (data) => {
        this.articulo = data;
        this.tituloArticulo = `${data.codigo} - ${data.titulo}`;
        this.actualizarEtapaActual(data.etapaActual.id);
        this.etapaMoverSeleccionadaId = this.etapaSiguientePermitida?.id ?? null;
        this.mostrarModalConfirmacionMover = false;
        this.etapaDestinoConfirmacion = null;
        this.limpiarTemporizadorModalExitoMover();
        this.mostrarModalExitoMover = false;
        this.mensajeExitoMover = '';
        this.mostrarModalConfirmacionAsignacion = false;
        this.miembroComiteConfirmacion = null;
        this.mostrarModalConfirmacionTurnitin = false;
        this.mostrarModalExitoTurnitin = false;
        this.mostrarModalConfirmacionCertificado = false;
        this.mensajeExitoTurnitin = '';
        this.committeeMemberSeleccionadoId =
          data.comiteEditorial?.id ?? this.committeeMemberSeleccionadoId;
        this.historialObservaciones = this.mapearObservacionesAHistorial(data.observaciones);
        this.mapearChecklistYMetadata(data);
        this.loading = false;
        this.cargarCertificadoPublicacion(data.id);
        alCompletar?.();
      },
      error: (err) => {
        console.error('Error al cargar artículo:', err);
        this.error = 'Error al cargar los datos del artículo';
        this.loading = false;
      },
    });
  }

  private mapearChecklistYMetadata(data: ArticuloFlujo): void {
    if (data.revisionFinalChecklist) {
      try {
        this.checklistRevisionFinal = {
          ajustesRevisores: false,
          cumpleNormativas: false,
          resumenYSecciones: false,
          numeroPaginas: false,
          normasFormato: false,
          referenciasBibliograficas: false,
          redaccionOrtografia: false,
          metadatosInglesEspanol: false,
          ...JSON.parse(data.revisionFinalChecklist),
        };
      } catch (e) {
        console.error('Error parsing checklist JSON', e);
      }
    } else {
      this.checklistRevisionFinal = {
        ajustesRevisores: false,
        cumpleNormativas: false,
        resumenYSecciones: false,
        numeroPaginas: false,
        normasFormato: false,
        referenciasBibliograficas: false,
        redaccionOrtografia: false,
        metadatosInglesEspanol: false,
      };
    }
  }

  private actualizarEtapaActual(etapaActualId: number): void {
    this.etapas = this.etapasDisponibles.map((etapa) => ({
      ...etapa,
      activa: etapa.id === etapaActualId,
    }));
  }

  cargarCertificadoPublicacion(articuloId: number): void {
    this.articulosService.listarCertificados().subscribe({
      next: (certificados) => {
        this.certificadoPublicacionCargado =
          certificados.find((c) => c.articuloId === articuloId && c.tipo === 'publicacion') ?? null;
      },
      error: () => {
        this.certificadoPublicacionCargado = null;
      },
    });
  }

  descargarCertificado(certificadoId: number): void {
    const cert = this.certificadoPublicacionCargado;
    const nombreOriginal = cert?.archivoNombreOriginal || `certificado-${certificadoId}.pdf`;

    this.articulosService.descargarCertificado(certificadoId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = normalizarNombreArchivo(nombreOriginal);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar certificado:', err);
        this.accionError = 'No fue posible descargar el certificado.';
        this.accionExitosa = null;
      },
    });
  }

  private mapearObservacionesAHistorial(observaciones: ObservacionBackend[] = []): RegistroFlujo[] {
    const historial = observaciones
      .map<RegistroFlujo>((obs) => {
        const fecha = new Date(obs.fechaSubida);
        const esCorreccionAutor = this.esAsuntoCorreccionAutor(obs.asunto ?? '');

        return {
          id: obs.id,
          usuarioId: obs.usuario?.id,
          etapaId: obs.etapa?.id,
          fechaOrden: fecha.getTime(),
          fecha: this.formatearFecha(obs.fechaSubida),
          autor: obs.usuario?.nombre ?? 'Usuario desconocido',
          rol: this.formatearRolHistorial(obs.usuario?.roles[0]?.nombre),
          asunto: this.formatearAsuntoHistorial(obs.asunto),
          comentario: obs.comentarios ?? undefined,
          esCorreccionAutor,
          expandido: esCorreccionAutor,
          archivos: obs.archivos.map((archivo) => ({
            nombre: normalizarNombreArchivo(archivo.archivoNombreOriginal),
            path: archivo.archivoPath,
          })),
        };
      })
      .sort((a, b) => b.fechaOrden - a.fechaOrden);

    historial.forEach((registro) => {
      if (!registro.esCorreccionAutor) {
        registro.correccionAceptada = false;
        registro.puedeAceptarCorreccion = false;
        return;
      }

      const correccionAceptada = historial.some((item) => {
        if (item.id === registro.id) {
          return false;
        }

        if (item.fechaOrden < registro.fechaOrden) {
          return false;
        }

        return this.esAsuntoAceptacionCorreccion(item.asunto);
      });

      registro.correccionAceptada = correccionAceptada;
      registro.puedeAceptarCorreccion = !correccionAceptada;
    });

    const primeraCorreccion = historial.find((item) => item.esCorreccionAutor);
    if (primeraCorreccion) {
      primeraCorreccion.expandido = true;
    }

    return historial;
  }

  private formatearRolHistorial(rol?: string): string {
    const valor = (rol ?? '').trim();
    if (!valor) {
      return 'Sin rol';
    }

    const normalizado = valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (normalizado.includes('comite-editorial') || normalizado.includes('comite editorial')) {
      return 'Comité editorial';
    }

    return valor.replace(/-/g, ' ');
  }

  private formatearAsuntoHistorial(asunto?: string): string {
    let valor = (asunto ?? '').trim();
    if (!valor) {
      return 'Sin asunto';
    }

    valor = valor.replace(
      /evaluaci[oó]n\s+de\s+comite[-\s]editorial/gi,
      'Evaluación de comité editorial',
    );

    // Mapear "Revisión por pares: AJUSTES" a "Revisión por pares: ACEPTAR"
    valor = valor.replace(/revisi[oó]n por pares:\s*ajustes/gi, 'Revisión por pares: ACEPTAR');

    // Mapear "Revisión por pares completada: AJUSTES" a "Revisión por pares completada: APROBADO"
    valor = valor.replace(
      /revisi[oó]n por pares completada:\s*ajustes/gi,
      'Revisión por pares completada: APROBADO',
    );

    return valor;
  }

  formatearComentario(comentario?: string | null): string {
    if (!comentario) {
      return '';
    }

    // Cortar el comentario si contiene la sección de la rúbrica detallada (1. Sobre...)
    let resumen = comentario;
    const indexSobre = comentario.search(/(?:\r?\n)?\d+\.\s+Sobre/i);
    if (indexSobre !== -1) {
      resumen = comentario.substring(0, indexSobre);
    } else {
      const indexSobreSinNumero = comentario.search(/(?:\r?\n)?Sobre la redacción/i);
      if (indexSobreSinNumero !== -1) {
        resumen = comentario.substring(0, indexSobreSinNumero);
      }
    }

    // Formatear líneas introduciendo saltos de línea antes de campos clave si vienen pegados
    resumen = resumen
      .replace(/\s*(Calificación:)/gi, '\n$1')
      .replace(/\s*(Recomendación:)/gi, '\n$1')
      .replace(/\s*(Comentarios:)/gi, '\n$1')
      .replace(/\s*(Jurado evaluador:)/gi, '\n$1')
      .replace(/\s*(Artículo:)/gi, '\n$1')
      .replace(/\s*(Recomendación seleccionada:)/gi, '\n$1')
      .replace(/\s*(Se aprueba para publicación:)/gi, '\n$1')
      .replace(/\s*(Criterios aprobados:)/gi, '\n$1')
      .replace(/\s*(Criterios rechazados:)/gi, '\n$1')
      .trim();

    // Mapear Ajustes -> Aceptar/Aprobado para visualización consistente
    resumen = resumen
      .replace(/Recomendación:\s*AJUSTES/gi, 'Recomendación: ACEPTAR')
      .replace(/Recomendación seleccionada:\s*ajustes/gi, 'Recomendación seleccionada: ACEPTAR')
      .replace(/Decisión:\s*AJUSTES/gi, 'Decisión: ACEPTAR')
      .replace(/Decisión final:\s*AJUSTES/gi, 'Decisión final: ACEPTAR');

    return resumen;
  }

  toggleRegistro(registro: RegistroFlujo): void {
    registro.expandido = !registro.expandido;
  }

  formatearFecha(fechaValor: string | Date): string {
    const valor = typeof fechaValor === 'string' ? fechaValor.trim() : fechaValor.toISOString();

    if (!valor) {
      return 'Sin fecha';
    }

    const sinZonaHoraria = !/(z|[+-]\d{2}:\d{2})$/i.test(valor);

    if (sinZonaHoraria) {
      const match = valor.match(
        /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::\d{2}(?:\.\d{1,3})?)?$/,
      );

      if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const dia = String(day).padStart(2, '0');
        const meses = [
          'ene',
          'feb',
          'mar',
          'abr',
          'may',
          'jun',
          'jul',
          'ago',
          'sep',
          'oct',
          'nov',
          'dic',
        ];

        return `${dia} ${meses[Math.max(0, month - 1)]} ${year}`;
      }
    }

    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Bogota',
    }).format(fecha);
  }

  formatearFechaVencimientoCorreccion(fechaValor: string | null): string {
    if (!fechaValor) {
      return 'Sin fecha';
    }

    return this.formatearFecha(fechaValor);
  }

  descargarArchivo(path: string, nombreOriginal: string): void {
    const filename = path.split(/[\\/]/).pop() || '';

    if (!filename) {
      this.accionError = 'No se pudo resolver el archivo a descargar.';
      this.accionExitosa = null;
      return;
    }

    this.articulosService.descargarArchivo(filename).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = normalizarNombreArchivo(nombreOriginal);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar archivo:', err);
        this.accionError = 'No fue posible descargar el archivo.';
        this.accionExitosa = null;
      },
    });
  }

  confirmarAceptacionCorreccion(registro: RegistroFlujo): void {
    if (!registro.esCorreccionAutor || !registro.puedeAceptarCorreccion) {
      return;
    }

    this.registroCorreccionConfirmacion = registro;
    this.comentarioAceptacionCorreccion = '';
    this.mostrarModalConfirmacionCorreccion = true;
  }

  cancelarConfirmacionAceptacionCorreccion(): void {
    this.mostrarModalConfirmacionCorreccion = false;
    this.registroCorreccionConfirmacion = null;
    this.comentarioAceptacionCorreccion = '';
  }

  confirmarAceptacionCorreccionModal(): void {
    const registro = this.registroCorreccionConfirmacion;
    if (!registro) {
      return;
    }

    const comentario = this.comentarioAceptacionCorreccion.trim() || undefined;
    this.cancelarConfirmacionAceptacionCorreccion();
    this.aceptarCorreccionAutor(registro, comentario);
  }

  aceptarCorreccionAutor(registro: RegistroFlujo, comentarios?: string): void {
    if (!this.articulo || !registro.esCorreccionAutor || !registro.puedeAceptarCorreccion) {
      return;
    }

    this.aceptandoCorreccionIds.add(registro.id);
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService
      .aceptarCorreccionAutor(this.articulo.id, registro.id, comentarios)
      .subscribe({
        next: (respuesta) => {
          this.aceptandoCorreccionIds.delete(registro.id);
          this.accionExitosa = respuesta.message || 'Corrección aceptada correctamente.';
          this.cargarArticulo(this.articulo!.id);
        },
        error: (err) => {
          this.aceptandoCorreccionIds.delete(registro.id);
          this.accionError = err?.error?.message ?? 'No se pudo aceptar la corrección.';
        },
      });
  }

  isAceptandoCorreccion(registroId: number): boolean {
    return this.aceptandoCorreccionIds.has(registroId);
  }

  get correccionTurnitinPendiente(): RegistroFlujo | null {
    if (!this.articulo || this.articulo.etapaActual.id !== 3) {
      return null;
    }

    const correccion = this.historialObservaciones.find(
      (registro) =>
        registro.etapaId === 3 && registro.esCorreccionAutor && registro.puedeAceptarCorreccion,
    );

    if (!correccion) {
      return null;
    }

    const hayRechazoPosterior = this.historialObservaciones.some(
      (registro) =>
        registro.fechaOrden > correccion.fechaOrden &&
        registro.asunto === 'Solicitud de corrección: Turnitin (Rechazado)',
    );

    return hayRechazoPosterior ? null : correccion;
  }

  confirmarRechazoCorreccion(registro: RegistroFlujo): void {
    if (!registro.esCorreccionAutor || !registro.puedeAceptarCorreccion) {
      return;
    }
    this.registroCorreccionRechazoConfirmacion = registro;
    this.comentarioRechazoCorreccion = '';
    this.mostrarModalConfirmacionRechazoCorreccion = true;
  }

  cancelarConfirmacionRechazoCorreccion(): void {
    this.mostrarModalConfirmacionRechazoCorreccion = false;
    this.registroCorreccionRechazoConfirmacion = null;
    this.comentarioRechazoCorreccion = '';
  }

  confirmarRechazoCorreccionModal(): void {
    const registro = this.registroCorreccionRechazoConfirmacion;
    if (!registro) {
      return;
    }
    const comentarios = this.comentarioRechazoCorreccion.trim();
    if (!comentarios) {
      return;
    }
    this.cancelarConfirmacionRechazoCorreccion();
    this.rechazarCorreccionAutor(registro, comentarios);
  }

  rechazarCorreccionAutor(registro: RegistroFlujo, comentarios: string): void {
    if (!this.articulo || !registro.esCorreccionAutor || !registro.puedeAceptarCorreccion) {
      return;
    }

    this.rechazandoCorreccionIds.add(registro.id);
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService
      .agregarObservacion(this.articulo.id, {
        asunto: 'Solicitud de corrección: Turnitin (Rechazado)',
        comentarios: comentarios,
        etapaId: 3,
      })
      .subscribe({
        next: (respuesta) => {
          this.rechazandoCorreccionIds.delete(registro.id);
          this.accionExitosa = 'Corrección rechazada correctamente.';
          this.cargarArticulo(this.articulo!.id);
        },
        error: (err) => {
          this.rechazandoCorreccionIds.delete(registro.id);
          this.accionError = err?.error?.message ?? 'No se pudo rechazar la corrección.';
        },
      });
  }

  isRechazandoCorreccion(registroId: number): boolean {
    return this.rechazandoCorreccionIds.has(registroId);
  }

  private esAsuntoCorreccionAutor(asunto: string): boolean {
    return /correccion enviada por autor|corrección enviada por autor/.test(
      (asunto ?? '').toLowerCase(),
    );
  }

  private esAsuntoAceptacionCorreccion(asunto: string): boolean {
    return /correccion aceptada|corrección aceptada|correccion aprobada|corrección aprobada/.test(
      (asunto ?? '').toLowerCase(),
    );
  }

  private esAsuntoEvaluacionComite(asunto: string): boolean {
    const texto = (asunto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return (
      texto.includes('evalu') &&
      texto.includes('comite') &&
      !texto.includes('prorroga') &&
      (texto.includes('acept') || texto.includes('rechaz'))
    );
  }

  private esAsuntoEvaluacionTurnitin(asunto: string): boolean {
    const texto = (asunto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return texto.includes('evalu') && texto.includes('turnitin');
  }

  get articuloYaSolicitadoCambiosTurnitin(): boolean {
    return this.historialVisible.some(
      (registro) =>
        registro.etapaId === 3 &&
        ((registro.asunto ?? '').toLowerCase().includes('solicitud') ||
          (registro.asunto ?? '').toLowerCase().includes('solicitar cambios') ||
          (registro.asunto ?? '').toLowerCase().includes('solicitar correccion') ||
          (registro.asunto ?? '').toLowerCase().includes('solicitar corrección')),
    );
  }
  private esAsuntoRevisionPares(asunto: string): boolean {
    const texto = (asunto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    return /^revision por pares:\s*(aceptar|ajustes|rechazar)/.test(texto);
  }

  private getFechaInicioRevisionParesActualMs(): number | null {
    if (!this.articulo) {
      return null;
    }

    const historialRevisionPares = (this.articulo.historialEtapas ?? [])
      .filter((historial) => historial.etapaId === FlujoTrabajoArticulo.ETAPA_REVISION_PARES)
      .filter((historial) => !historial.fechaFin)
      .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());

    const fechaInicioActual = historialRevisionPares[0]?.fechaInicio;
    if (!fechaInicioActual) {
      return null;
    }

    const fechaMs = new Date(fechaInicioActual).getTime();
    return Number.isFinite(fechaMs) ? fechaMs : null;
  }

  get etapaActual(): string {
    const etapaActiva = this.etapas.find((etapa) => etapa.activa);
    return etapaActiva?.titulo ?? 'Sin etapa';
  }

  get etiquetaEtapaActual(): string {
    const etapaActiva = this.etapas.find((etapa) => etapa.activa);
    return etapaActiva ? `EN ${etapaActiva.titulo.toUpperCase()}` : 'SIN ETAPA';
  }

  get historialVisible(): RegistroFlujo[] {
    return this.historialObservaciones;
  }

  get etapasTimeline(): EtapaTimeline[] {
    if (!this.articulo) {
      return [];
    }

    const etapaActualId = this.articulo.etapaActual.id;
    const indiceEtapaActual = this.ordenEtapasFlujo.indexOf(etapaActualId);
    const historialEtapas = this.articulo.historialEtapas ?? [];
    const historialPorEtapa = new Map<number, string>();

    for (const historial of historialEtapas) {
      if (!historialPorEtapa.has(historial.etapaId)) {
        historialPorEtapa.set(historial.etapaId, historial.fechaInicio);
      }
    }

    if (this.estaEnRevisionPreliminar) {
      const etapaActual = this.etapasDisponibles.find((etapa) => etapa.id === etapaActualId);
      const fechaActual = historialPorEtapa.get(etapaActualId);

      if (!etapaActual) {
        return [];
      }

      return [
        {
          id: etapaActual.id,
          titulo: etapaActual.titulo,
          estado: 'actual',
          fecha: fechaActual ? this.formatearFechaCorta(fechaActual) : 'Por definir',
          descripcion: this.etapasDescripciones.get(etapaActual.id) ?? '',
        },
      ];
    }

    return this.etapasDisponibles.map((etapa) => {
      const indiceEtapa = this.ordenEtapasFlujo.indexOf(etapa.id);
      const estado: 'completada' | 'actual' | 'pendiente' =
        indiceEtapa !== -1 && indiceEtapaActual !== -1 && indiceEtapa < indiceEtapaActual
          ? 'completada'
          : etapa.id === etapaActualId
            ? 'actual'
            : 'pendiente';

      const fechaRegistrada = historialPorEtapa.get(etapa.id);

      return {
        id: etapa.id,
        titulo: etapa.titulo,
        estado,
        fecha: fechaRegistrada ? this.formatearFechaCorta(fechaRegistrada) : 'Por definir',
        descripcion: this.etapasDescripciones.get(etapa.id) ?? '',
      };
    });
  }

  private formatearFechaCorta(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) {
      return 'Por definir';
    }

    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  onArchivoObservacionSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;

    this.archivoObservacion = file;
    this.nombreArchivoObservacion = file?.name ?? '';
  }

  // Turnitin Drag & Drop
  onDragOverTurnitin(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoTurnitin = true;
  }

  onDragLeaveTurnitin(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoTurnitin = false;
  }

  onDropTurnitin(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoTurnitin = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.validarYAsignarArchivoTurnitin(file);
    }
  }

  private validarYAsignarArchivoTurnitin(file: File): void {
    if (!this.esTamanoArchivoTurnitinValido(file)) {
      this.archivoTurnitin = null;
      this.nombreArchivoTurnitin = '';
      this.abrirModalErrorTurnitin('El archivo de Turnitin no puede superar los 10 MB.');
      return;
    }
    const nombre = file.name.toLowerCase();
    const ext = nombre.split('.').pop() ?? '';
    const permitidos = ['pdf', 'docx', 'doc'];
    if (!permitidos.includes(ext)) {
      this.archivoTurnitin = null;
      this.nombreArchivoTurnitin = '';
      this.abrirModalErrorTurnitin('Solo se permiten archivos PDF, DOC y DOCX válidos.');
      return;
    }
    this.archivoTurnitin = file;
    this.nombreArchivoTurnitin = file.name;
  }

  onArchivoTurnitinSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (file) {
      this.validarYAsignarArchivoTurnitin(file);
    }
  }

  // Committee Drag & Drop
  onDragOverComite(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoComite = true;
  }

  onDragLeaveComite(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoComite = false;
  }

  onDropComite(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoComite = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.validarYAsignarArchivoComite(file);
    }
  }

  private validarYAsignarArchivoComite(file: File): void {
    const nombre = file.name.toLowerCase();
    const ext = nombre.split('.').pop() ?? '';
    const permitidos = ['pdf', 'docx', 'doc'];
    if (!permitidos.includes(ext)) {
      this.archivoComite = null;
      this.nombreArchivoComite = '';
      this.accionError = 'Solo se permiten archivos PDF, DOC y DOCX.';
      this.accionExitosa = null;
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.archivoComite = null;
      this.nombreArchivoComite = '';
      this.accionError = 'El archivo de rúbrica no puede superar los 10 MB.';
      this.accionExitosa = null;
      return;
    }
    this.archivoComite = file;
    this.nombreArchivoComite = file.name;
    this.accionError = null;
    this.accionExitosa = null;
  }

  onArchivoComiteSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (file) {
      this.validarYAsignarArchivoComite(file);
    }
  }

  // Certification Drag & Drop
  onDragOverCertificacion(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoCertificacion = true;
  }

  onDragLeaveCertificacion(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoCertificacion = false;
  }

  onDropCertificacion(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoCertificacion = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.validarYAsignarArchivoCertificacion(file);
    }
  }

  private validarYAsignarArchivoCertificacion(file: File): void {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.archivoCertificacion = null;
      this.nombreArchivoCertificacion = '';
      this.accionError = 'Solo se permite subir el certificado de publicación en PDF.';
      this.accionExitosa = null;
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.archivoCertificacion = null;
      this.nombreArchivoCertificacion = '';
      this.accionError = 'El archivo de certificación no puede superar los 10 MB.';
      this.accionExitosa = null;
      return;
    }
    this.archivoCertificacion = file;
    this.nombreArchivoCertificacion = file.name;
    this.accionError = null;
    this.accionExitosa = null;
  }

  onArchivoCertificacionSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (file) {
      this.validarYAsignarArchivoCertificacion(file);
    }
  }

  onPorcentajeTurnitinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorCrudo = input.value.trim();

    if (!valorCrudo) {
      this.porcentajeTurnitin = null;
      return;
    }

    let numero = Number(valorCrudo.replace(',', '.'));

    if (!Number.isFinite(numero)) {
      input.value = '';
      this.porcentajeTurnitin = null;
      return;
    }

    const valorAcotado = Math.round(Math.max(0, Math.min(100, numero)));
    this.porcentajeTurnitin = valorAcotado;

    if (valorAcotado !== numero || input.value !== String(valorAcotado)) {
      input.value = String(valorAcotado);
    }
  }

  private esTamanoArchivoTurnitinValido(file: File): boolean {
    return file.size <= FlujoTrabajoArticulo.MAX_TURNITIN_FILE_SIZE_BYTES;
  }

  abrirConfirmacionCertificado(): void {
    if (!this.archivoCertificacion) {
      this.accionError = 'Debes seleccionar un archivo de certificado válido.';
      return;
    }
    this.mostrarModalConfirmacionCertificado = true;
  }

  cancelarConfirmacionCertificado(): void {
    this.mostrarModalConfirmacionCertificado = false;
  }

  subirCertificadoPublicacion(): void {
    if (!this.articulo || !this.puedeMostrarCertificacion || this.subiendoCertificacion) {
      return;
    }

    if (!this.archivoCertificacion) {
      this.accionError = 'Debes adjuntar el certificado de publicación en PDF.';
      this.accionExitosa = null;
      return;
    }

    this.cancelarConfirmacionCertificado();
    this.subiendoCertificacion = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService
      .subirCertificado(this.articulo.id, {
        tipo: 'publicacion',
        titulo: 'Certificado de publicación',
        contextoRequerimiento: 'editorial',
        etapaReferencia: 'Certificación',
        archivo: this.archivoCertificacion,
      })
      .subscribe({
        next: (event: any) => {
          if (event.type === 1) { // HttpEventType.UploadProgress
            this.progresoCertificacion = Math.round((100 * event.loaded) / event.total!);
          } else if (event.type === 4) { // HttpEventType.Response
            const respuesta = event.body;
            this.subiendoCertificacion = false;
            this.progresoCertificacion = 0;
            this.archivoCertificacion = null;
            this.nombreArchivoCertificacion = '';
            this.cargarArticulo(this.articulo!.id, () => {
              this.accionExitosa =
                respuesta.message || 'Certificado de publicación cargado correctamente.';
            });
          }
        },
        error: (err) => {
          this.subiendoCertificacion = false;
          this.progresoCertificacion = 0;
          this.accionError =
            err?.error?.message ?? 'No se pudo subir el certificado de publicación.';
        },
      });
  }

  abrirConfirmacionAsignacionComite(): void {
    if (!this.articulo || !this.committeeMemberSeleccionadoId || this.asignandoComite) {
      return;
    }

    if (this.articulo.comiteEditorial) {
      this.accionError = 'Este artículo ya tiene un integrante de comité asignado.';
      this.accionExitosa = null;
      return;
    }

    const miembroSeleccionado = this.miembroComiteSeleccionado;
    if (!miembroSeleccionado) {
      this.accionError = 'Selecciona un integrante válido del comité.';
      this.accionExitosa = null;
      return;
    }

    this.miembroComiteConfirmacion = miembroSeleccionado;
    this.mostrarModalConfirmacionAsignacion = true;
  }

  cancelarConfirmacionAsignacionComite(): void {
    this.mostrarModalConfirmacionAsignacion = false;
    this.miembroComiteConfirmacion = null;
  }

  cerrarModalExitoAsignacion(): void {
    this.mostrarModalExitoAsignacion = false;
    this.mensajeExitoAsignacion = '';
  }

  asignarComiteEditorial(): void {
    if (!this.articulo || !this.committeeMemberSeleccionadoId || this.asignandoComite) {
      return;
    }

    this.cancelarConfirmacionAsignacionComite();
    this.asignandoComite = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService
      .asignarComiteEditorial(this.articulo.id, this.committeeMemberSeleccionadoId)
      .subscribe({
        next: (respuesta) => {
          this.asignandoComite = false;
          this.accionExitosa = respuesta.message;
          const nombreMiembro =
            this.miembroComiteSeleccionado?.nombre ?? 'el integrante seleccionado';
          this.mensajeExitoAsignacion = `Se asignó correctamente ${nombreMiembro} al Comité Editorial.`;
          this.mostrarModalExitoAsignacion = true;
          this.cargarArticulo(this.articulo!.id);
          this.loadCommitteeMembers();
        },
        error: (err) => {
          this.asignandoComite = false;
          this.accionError = err?.error?.message ?? 'No se pudo asignar el artículo al comité.';
        },
      });
  }

  evaluarArticuloComite(): void {
    if (!this.articulo || !this.esComiteEditorial || this.evaluandoComite) {
      return;
    }

    if (this.decisionComite === 'rechazar' && !this.observacionComite.trim()) {
      this.accionError = 'Debes escribir una observación cuando rechazas un artículo.';
      this.accionExitosa = null;
      return;
    }

    this.evaluandoComite = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService
      .evaluarComite(this.articulo.id, {
        decision: this.decisionComite,
        observacion: this.observacionComite.trim() || undefined,
        archivo: this.archivoComite,
      })
      .subscribe({
        next: (event: any) => {
          if (event.type === 1) { // HttpEventType.UploadProgress
            this.progresoComite = Math.round((100 * event.loaded) / event.total!);
          } else if (event.type === 4) { // HttpEventType.Response
            const respuesta = event.body;
            this.evaluandoComite = false;
            this.progresoComite = 0;
            this.observacionComite = '';
            this.archivoComite = null;
            this.nombreArchivoComite = '';
            this.accionExitosa = respuesta.message || 'Evaluación de comité editorial registrada.';
            this.cargarArticulo(this.articulo!.id);
          }
        },
        error: (err) => {
          this.evaluandoComite = false;
          this.progresoComite = 0;
          this.accionError =
            err?.error?.message ?? 'No se pudo registrar la evaluación del comité.';
        },
      });
  }

  agregarObservacion(): void {
    if (!this.articulo) {
      return;
    }

    const asunto = this.asuntoObservacion.trim();
    if (!asunto) {
      this.accionError = 'El asunto de la observación es obligatorio.';
      this.accionExitosa = null;
      return;
    }

    this.guardandoObservacion = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService
      .agregarObservacion(this.articulo.id, {
        asunto,
        comentarios: this.comentarioObservacion.trim() || undefined,
        etapaId: this.articulo.etapaActual.id,
        archivo: this.archivoObservacion,
      })
      .subscribe({
        next: () => {
          this.guardandoObservacion = false;
          this.asuntoObservacion = '';
          this.comentarioObservacion = '';
          this.archivoObservacion = null;
          this.nombreArchivoObservacion = '';
          this.accionExitosa = 'Observación añadida correctamente.';
          this.cargarArticulo(this.articulo!.id);
        },
        error: (err) => {
          console.error('Error al agregar observación:', err);
          this.guardandoObservacion = false;
          this.accionError = err?.error?.message ?? 'No se pudo guardar la observación.';
        },
      });
  }

  abrirConfirmacionMoverArticulo(): void {
    if (!this.articulo) {
      return;
    }

    const etapaSiguiente = this.etapaSiguientePermitida;

    if (!etapaSiguiente) {
      this.accionError = 'Este artículo ya se encuentra en la última etapa del flujo editorial.';
      this.accionExitosa = null;
      return;
    }

    if (!this.etapaMoverSeleccionadaId || this.etapaMoverSeleccionadaId !== etapaSiguiente.id) {
      this.accionError = `Solo puedes avanzar a la siguiente etapa: ${etapaSiguiente.titulo}.`;
      this.accionExitosa = null;
      return;
    }

    if (this.bloqueaAvancePorFaltaCriterioRevisor) {
      this.accionError =
        'No puedes avanzar desde Revisión por pares hasta que el revisor asignado emita su criterio.';
      this.accionExitosa = null;
      return;
    }

    if (!this.puedeMoverPorTerminacion) {
      this.accionError =
        this.mensajeReglaMovimiento ||
        'No puedes avanzar hasta que la etapa actual se haya finalizado o aceptado.';
      this.accionExitosa = null;
      return;
    }

    this.etapaDestinoConfirmacion = etapaSiguiente;
    this.mostrarModalConfirmacionMover = true;
  }

  cancelarConfirmacionMoverArticulo(): void {
    this.mostrarModalConfirmacionMover = false;
    this.etapaDestinoConfirmacion = null;
  }

  cerrarModalExitoMover(): void {
    this.limpiarTemporizadorModalExitoMover();
    this.mostrarModalExitoMover = false;
    this.mensajeExitoMover = '';
  }

  private programarCierreModalExitoMover(): void {
    this.limpiarTemporizadorModalExitoMover();

    this.modalExitoMoverTimeoutId = setTimeout(() => {
      this.mostrarModalExitoMover = false;
      this.mensajeExitoMover = '';
      this.modalExitoMoverTimeoutId = null;
    }, FlujoTrabajoArticulo.MODAL_EXITO_MOVER_AUTOCLOSE_MS);
  }

  private limpiarTemporizadorModalExitoMover(): void {
    if (this.modalExitoMoverTimeoutId) {
      clearTimeout(this.modalExitoMoverTimeoutId);
      this.modalExitoMoverTimeoutId = null;
    }
  }

  moverArticulo(): void {
    if (!this.articulo || !this.etapaMoverSeleccionadaId) {
      return;
    }

    const etapaSiguiente = this.etapaSiguientePermitida;

    if (!etapaSiguiente) {
      this.accionError = 'Este artículo ya se encuentra en la última etapa del flujo editorial.';
      this.accionExitosa = null;
      return;
    }

    if (this.etapaMoverSeleccionadaId !== etapaSiguiente.id) {
      this.accionError = `Solo puedes avanzar a la siguiente etapa: ${etapaSiguiente.titulo}.`;
      this.accionExitosa = null;
      return;
    }

    if (this.bloqueaAvancePorFaltaCriterioRevisor) {
      this.accionError =
        'No puedes avanzar desde Revisión por pares hasta que el revisor asignado emita su criterio.';
      this.accionExitosa = null;
      return;
    }

    if (!this.puedeMoverPorTerminacion) {
      this.accionError =
        this.mensajeReglaMovimiento ||
        'No puedes avanzar hasta que la etapa actual se haya finalizado o aceptado.';
      this.accionExitosa = null;
      return;
    }

    this.cancelarConfirmacionMoverArticulo();
    this.moviendoEtapa = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService.moverEtapa(this.articulo.id, this.etapaMoverSeleccionadaId).subscribe({
      next: () => {
        this.moviendoEtapa = false;
        this.cargarArticulo(this.articulo!.id, () => {
          this.accionExitosa = null;
          this.mensajeExitoMover = `El artículo avanzó correctamente a ${etapaSiguiente.titulo}.`;
          this.mostrarModalExitoMover = true;
          this.programarCierreModalExitoMover();
        });
      },
      error: (err) => {
        console.error('Error al mover etapa:', err);
        this.moviendoEtapa = false;
        this.accionError = err?.error?.message ?? 'No se pudo mover el artículo de etapa.';
      },
    });
  }

  get esComiteEditorial(): boolean {
    return this.authService.hasAnyRole(['comite-editorial']);
  }

  get estaEnEtapaComite(): boolean {
    return this.articulo?.etapaActual?.id === FlujoTrabajoArticulo.ETAPA_COMITE_EDITORIAL;
  }

  get estaEnRevisionPreliminar(): boolean {
    return this.articulo?.etapaActual?.id === FlujoTrabajoArticulo.ETAPA_REVISION_PRELIMINAR;
  }

  get esAdminEditorial(): boolean {
    return this.authService.hasAnyRole(['admin', 'director', 'monitor']);
  }

  get soloPuedeMoverAComiteEnPreliminar(): boolean {
    return this.esAdminEditorial && this.estaEnRevisionPreliminar;
  }

  get documentosRubrica(): ArchivoRegistro[] {
    const documentos = this.historialVisible.flatMap(
      (registro) =>
        registro.archivos?.map((archivo) => ({
          nombre: archivo.nombre,
          path: archivo.path,
        })) ?? [],
    );

    const vistos = new Set<string>();
    return documentos.filter((doc) => {
      if (vistos.has(doc.path)) {
        return false;
      }

      vistos.add(doc.path);
      return true;
    });
  }

  get puedeAsignarComite(): boolean {
    return this.authService.hasAnyRole(['admin', 'director', 'monitor']);
  }

  get puedeMostrarObservacion(): boolean {
    if (this.soloPuedeMoverAComiteEnPreliminar) {
      return false;
    }

    const etapaActualId = this.articulo?.etapaActual?.id ?? null;
    return etapaActualId === FlujoTrabajoArticulo.ETAPA_REVISION_PRELIMINAR;
  }

  get puedeMostrarTurnitin(): boolean {
    const etapaActualId = this.articulo?.etapaActual?.id ?? null;
    return etapaActualId === 3 && this.authService.hasAnyRole(['admin', 'director', 'monitor']);
  }

  get estaEnCertificacion(): boolean {
    return this.articulo?.etapaActual?.id === FlujoTrabajoArticulo.ETAPA_CERTIFICACION;
  }

  get puedeMostrarCertificacion(): boolean {
    const etapaActualId = this.articulo?.etapaActual?.id ?? null;
    return this.esAdminEditorial && etapaActualId === FlujoTrabajoArticulo.ETAPA_CERTIFICACION;
  }

  get puedeMostrarRevisionPares(): boolean {
    const etapaActualId = this.articulo?.etapaActual?.id ?? null;
    return etapaActualId === FlujoTrabajoArticulo.ETAPA_REVISION_PARES;
  }

  get puedeMostrarAsignacionComite(): boolean {
    const etapaActualId = this.articulo?.etapaActual?.id ?? null;
    return this.puedeAsignarComite && etapaActualId === FlujoTrabajoArticulo.ETAPA_COMITE_EDITORIAL;
  }

  get articuloYaEvaluadoPorComite(): boolean {
    if (this.articulo?.evaluacionComiteRealizada) {
      return true;
    }
    return this.historialVisible.some((registro) => this.esAsuntoEvaluacionComite(registro.asunto));
  }

  get articuloYaEvaluadoPorTurnitin(): boolean {
    return this.historialVisible.some(
      (registro) => registro.etapaId === 3 && this.esAsuntoEvaluacionTurnitin(registro.asunto),
    );
  }

  get solicitudProrrogaCorreccionPendiente(): boolean {
    return !!this.articulo?.solicitudProrrogaCorreccionPendiente;
  }

  get solicitudProrrogaComitePendiente(): boolean {
    return !!this.articulo?.solicitudProrrogaComitePendiente;
  }

  get solicitudProrrogaRevisorPendiente(): boolean {
    return !!this.articulo?.solicitudProrrogaRevisorPendiente;
  }

  get fechaVencimientoCorreccion(): string | null {
    return this.articulo?.fechaVencimientoCorreccion ?? null;
  }

  get resultadoEvaluacionComite(): 'aceptado' | 'rechazado' | null {
    const evaluacionComite = this.historialVisible.find((registro) =>
      this.esAsuntoEvaluacionComite(registro.asunto),
    );

    if (!evaluacionComite) {
      return null;
    }

    const asunto = (evaluacionComite.asunto ?? '').toLowerCase();
    if (asunto.includes('rechaz')) {
      return 'rechazado';
    }

    if (asunto.includes('acept')) {
      return 'aceptado';
    }

    return null;
  }

  get evaluacionComiteRegistro(): RegistroFlujo | null {
    return this.historialVisible.find((registro) =>
      this.esAsuntoEvaluacionComite(registro.asunto),
    ) ?? null;
  }

  get evaluacionParesRegistro(): RegistroFlujo | null {
    if (!this.articulo) {
      return null;
    }

    if (this.articulo.etapaActual?.id !== FlujoTrabajoArticulo.ETAPA_REVISION_PARES) {
      return null;
    }

    const revisorUsuarioId = this.articulo.revisor?.usuarioId;
    if (!revisorUsuarioId) {
      return null;
    }

    const fechaInicioRevisionParesActualMs = this.getFechaInicioRevisionParesActualMs();

    return this.historialVisible.find((registro) => {
      if (registro.etapaId !== FlujoTrabajoArticulo.ETAPA_REVISION_PARES) {
        return false;
      }

      if (registro.usuarioId !== revisorUsuarioId) {
        return false;
      }

      if (!this.esAsuntoRevisionPares(registro.asunto)) {
        return false;
      }

      if (fechaInicioRevisionParesActualMs === null) {
        return true;
      }

      return registro.fechaOrden >= fechaInicioRevisionParesActualMs;
    }) ?? null;
  }

  get decisionRevisionParesCompleto(): 'aceptar' | 'ajustes' | 'rechazar' | null {
    const registro = this.evaluacionParesRegistro;
    if (!registro) {
      return null;
    }
    const comentario = (registro.comentario ?? '').toLowerCase();
    if (comentario.includes('decisión: aceptar') || comentario.includes('decision: aceptar')) {
      return 'aceptar';
    }
    if (comentario.includes('decisión: ajustes') || comentario.includes('decision: ajustes')) {
      return 'ajustes';
    }
    if (comentario.includes('decisión: rechazar') || comentario.includes('decision: rechazar')) {
      return 'rechazar';
    }
    const asunto = (registro.asunto ?? '').toLowerCase();
    if (asunto.includes('rechazar')) {
      return 'rechazar';
    }
    return 'aceptar';
  }

  get mensajeResultadoPares(): string {
    const decision = this.decisionRevisionParesCompleto;
    if (decision === 'aceptar') {
      return 'El revisor por pares aprobó el artículo. El equipo editorial ya puede moverlo a la siguiente etapa.';
    }
    if (decision === 'ajustes') {
      return 'El revisor por pares indicó que el artículo requiere ajustes. Por favor, solicita las correcciones correspondientes.';
    }
    if (decision === 'rechazar') {
      return 'El revisor por pares rechazó el artículo. El artículo queda descartado y no debe avanzar de etapa.';
    }
    return '';
  }

  get resultadoRevisionParesActual(): 'aceptar' | 'rechazar' | null {
    if (!this.articulo) {
      return null;
    }

    if (this.articulo.etapaActual?.id !== FlujoTrabajoArticulo.ETAPA_REVISION_PARES) {
      return null;
    }

    const revisorUsuarioId = this.articulo.revisor?.usuarioId;
    if (!revisorUsuarioId) {
      return null;
    }

    const fechaInicioRevisionParesActualMs = this.getFechaInicioRevisionParesActualMs();

    // Buscar el registro de revisión por pares más reciente del revisor en esta etapa
    const registroRevision = this.historialVisible.find((registro) => {
      if (registro.etapaId !== FlujoTrabajoArticulo.ETAPA_REVISION_PARES) {
        return false;
      }

      if (registro.usuarioId !== revisorUsuarioId) {
        return false;
      }

      if (!this.esAsuntoRevisionPares(registro.asunto)) {
        return false;
      }

      if (fechaInicioRevisionParesActualMs === null) {
        return true;
      }

      return registro.fechaOrden >= fechaInicioRevisionParesActualMs;
    });

    if (!registroRevision) {
      return null;
    }

    const asunto = (registroRevision.asunto ?? '').toLowerCase();
    if (asunto.includes('aceptar') || asunto.includes('ajustes')) {
      return 'aceptar';
    }
    if (asunto.includes('rechazar')) {
      return 'rechazar';
    }

    return null;
  }

  get mensajeResultadoComite(): string {
    if (this.resultadoEvaluacionComite === 'aceptado') {
      return 'Comité Editorial aprobó el artículo. El equipo editorial ya puede moverlo a la siguiente etapa.';
    }

    if (this.resultadoEvaluacionComite === 'rechazado') {
      return 'Comité Editorial rechazó el artículo. El artículo queda rechazado y no debe avanzar de etapa.';
    }

    return '';
  }

  get puedeMostrarEvaluacionComite(): boolean {
    const etapaActualId = this.articulo?.etapaActual?.id ?? null;
    return (
      this.esComiteEditorial &&
      etapaActualId === FlujoTrabajoArticulo.ETAPA_COMITE_EDITORIAL &&
      !this.articuloYaEvaluadoPorComite
    );
  }

  get etapasDisponiblesMover(): EtapaFlujo[] {
    if (!this.etapaSiguientePermitida) {
      return [];
    }

    return [this.etapaSiguientePermitida];
  }

  get etapaSiguientePermitida(): EtapaFlujo | null {
    if (this.resultadoEvaluacionComite === 'rechazado') {
      return null;
    }

    if (this.estaEnEtapaComite && this.resultadoEvaluacionComite !== 'aceptado') {
      return null;
    }

    const etapaActualId = this.articulo?.etapaActual?.id;
    if (!etapaActualId) {
      return null;
    }

    if (etapaActualId === 9) {
      const decision = this.decisionRevisionFinalGuardada;
      if (decision === 'aceptar') {
        return this.etapas.find((etapa) => etapa.id === 8) ?? null;
      } else if (decision === 'rechazar') {
        return { id: 7, titulo: 'Descartado', activa: false };
      }
      return null;
    }

    const indiceActual = this.ordenEtapasFlujo.indexOf(etapaActualId);
    if (indiceActual === -1) {
      return null;
    }

    const siguienteEtapaId = this.ordenEtapasFlujo[indiceActual + 1];
    if (!siguienteEtapaId) {
      return null;
    }

    return this.etapas.find((etapa) => etapa.id === siguienteEtapaId) ?? null;
  }

  get etapaActualTerminada(): boolean {
    if (!this.articulo) return false;
    const etapaId = this.articulo.etapaActual?.id;
    if (!etapaId) return false;

    return (this.articulo.historialEtapas ?? []).some((h) => h.etapaId === etapaId && !!h.fechaFin);
  }

  get puedeMoverPorTerminacion(): boolean {
    if (!this.articulo) {
      return false;
    }

    const etapaId = this.articulo.etapaActual?.id;

    // Revisión Preliminar (1): se puede mover libremente
    if (etapaId === FlujoTrabajoArticulo.ETAPA_REVISION_PRELIMINAR) {
      return true;
    }

    // Comité Editorial (6): se puede mover si fue aceptada
    if (etapaId === FlujoTrabajoArticulo.ETAPA_COMITE_EDITORIAL) {
      return this.resultadoEvaluacionComite === 'aceptado';
    }

    // Turnitin (3): se puede mover si ya fue evaluado por Turnitin
    // Y, si se solicitaron cambios, la última corrección ya fue aceptada
    if (etapaId === 3) {
      if (!this.articuloYaEvaluadoPorTurnitin) {
        return false;
      }

      if (!this.articulo?.fechaVencimientoCorreccion) {
        return true;
      }

      const TurnitinRequestAsuntos = [
        'solicitud',
        'solicitar cambios',
        'solicitar correccion',
        'solicitar corrección',
        'requiere corrección',
        'requiere correccion',
      ];

      const TurnitinAcciones = this.historialVisible.filter((obs) => {
        if (obs.etapaId !== 3) return false;
        const asunto = (obs.asunto ?? '').toLowerCase();
        const esRequest = TurnitinRequestAsuntos.some((a) => asunto.includes(a));
        const esAutorUpload =
          asunto === 'corrección enviada por autor' ||
          asunto === 'correccion enviada por autor' ||
          obs.esCorreccionAutor === true;
        const esAceptacion =
          asunto === 'corrección del autor aceptada' ||
          asunto === 'correccion del autor aceptada' ||
          obs.correccionAceptada === true;
        return esRequest || esAutorUpload || esAceptacion;
      });

      if (TurnitinAcciones.length > 0) {
        const TurnitinAccionesSorted = [...TurnitinAcciones].sort((a, b) => b.id - a.id);
        const ultimaAccion = TurnitinAccionesSorted[0];
        const asuntoUltima = (ultimaAccion.asunto ?? '').toLowerCase();
        const esAceptada =
          asuntoUltima === 'corrección del autor aceptada' ||
          asuntoUltima === 'correccion del autor aceptada' ||
          ultimaAccion.correccionAceptada === true;
        return esAceptada;
      }

      return true;
    }

    // Revisión por pares (4): se puede mover si el revisor emitió criterio y fue 'aceptar'
    if (etapaId === FlujoTrabajoArticulo.ETAPA_REVISION_PARES) {
      return (
        this.revisorAsignadoEmitioCriterioActual && this.resultadoRevisionParesActual === 'aceptar'
      );
    }

    // Certificación (8): requiere que se haya subido el certificado
    if (etapaId === FlujoTrabajoArticulo.ETAPA_CERTIFICACION) {
      return this.etapaActualTerminada;
    }

    // Revisión final (9): se puede mover si la decisión de la revisión final fue confirmada y guardada
    if (etapaId === 9) {
      const decision = this.decisionRevisionFinalGuardada;
      if (!decision) {
        return false;
      }
      if (decision === 'aceptar') {
        const checklist = this.checklistRevisionFinal;
        return !!(
          checklist.ajustesRevisores &&
          checklist.cumpleNormativas &&
          checklist.resumenYSecciones &&
          checklist.numeroPaginas &&
          checklist.normasFormato &&
          checklist.referenciasBibliograficas &&
          checklist.redaccionOrtografia &&
          checklist.metadatosInglesEspanol
        );
      }
      return true;
    }

    // Lógica por defecto para otros estados
    return this.etapaActualTerminada;
  }

  get revisorAsignadoEmitioCriterioActual(): boolean {
    if (!this.articulo) {
      return false;
    }

    if (this.articulo.etapaActual?.id !== FlujoTrabajoArticulo.ETAPA_REVISION_PARES) {
      return true;
    }

    const revisorUsuarioId = this.articulo.revisor?.usuarioId;
    if (!revisorUsuarioId) {
      return false;
    }

    const fechaInicioRevisionParesActualMs = this.getFechaInicioRevisionParesActualMs();

    return this.historialVisible.some((registro) => {
      if (registro.etapaId !== FlujoTrabajoArticulo.ETAPA_REVISION_PARES) {
        return false;
      }

      if (registro.usuarioId !== revisorUsuarioId) {
        return false;
      }

      if (!this.esAsuntoRevisionPares(registro.asunto)) {
        return false;
      }

      if (fechaInicioRevisionParesActualMs === null) {
        return true;
      }

      return registro.fechaOrden >= fechaInicioRevisionParesActualMs;
    });
  }

  get bloqueaAvancePorFaltaCriterioRevisor(): boolean {
    if (!this.articulo) {
      return false;
    }

    return (
      this.articulo.etapaActual?.id === FlujoTrabajoArticulo.ETAPA_REVISION_PARES &&
      !this.revisorAsignadoEmitioCriterioActual
    );
  }

  get mensajeReglaMovimiento(): string {
    if (this.resultadoEvaluacionComite === 'rechazado') {
      return 'El artículo fue rechazado por Comité Editorial y no puede avanzar de etapa.';
    }

    if (this.estaEnEtapaComite && this.resultadoEvaluacionComite !== 'aceptado') {
      return 'Antes de mover a Turnitin, el Comité Editorial debe evaluar y remitir la decisión del artículo.';
    }

    if (this.bloqueaAvancePorFaltaCriterioRevisor) {
      return 'No puedes avanzar desde Revisión por pares hasta que el revisor asignado emita su criterio.';
    }

    if (this.estaEnCertificacion && !this.etapaActualTerminada) {
      return 'Primero sube el certificado de publicación para cerrar la etapa de Certificación.';
    }

    if (!this.puedeMoverPorTerminacion) {
      if (this.articulo?.etapaActual?.id === 3) {
        if (!this.articuloYaEvaluadoPorTurnitin) {
          return 'Debes registrar la evaluación de Turnitin antes de avanzar.';
        }
        return 'El artículo tiene correcciones pendientes en Turnitin. El autor debe enviar los cambios.';
      }
      if (this.articulo?.etapaActual?.id === 9) {
        return 'Completa todos los ítems de la lista de revisión final antes de avanzar a la etapa de Certificación.';
      }
      if (this.articulo?.etapaActual?.id === FlujoTrabajoArticulo.ETAPA_REVISION_PARES) {
        if (this.resultadoRevisionParesActual === 'rechazar') {
          return 'El artículo fue rechazado en la revisión por pares y queda descartado.';
        }
        return 'No puedes avanzar hasta que el revisor asignado emita un criterio de aceptación.';
      }
      return 'La etapa actual no está finalizada ni aceptada.';
    }

    if (this.etapaSiguientePermitida) {
      return `Solo puedes avanzar a la siguiente etapa: ${this.etapaSiguientePermitida.titulo}.`;
    }

    return 'Este artículo ya está en la última etapa del flujo editorial.';
  }

  getNumeroEtapa(etapaId: number): number {
    const indice = this.ordenEtapasFlujo.indexOf(etapaId);
    return indice === -1 ? 0 : indice + 1;
  }

  get miembroComiteSeleccionado(): UsuarioBackend | null {
    if (!this.committeeMemberSeleccionadoId) {
      return null;
    }

    return (
      this.committeeMembers.find((member) => member.id === this.committeeMemberSeleccionadoId) ??
      null
    );
  }

  get botonAsignacionLabel(): string {
    return 'Asignar';
  }

  get puedeAsignarComiteInicial(): boolean {
    return !this.articulo?.comiteEditorial;
  }

  get debePausarAutoRefresh(): boolean {
    return (
      this.loading ||
      this.guardandoObservacion ||
      this.moviendoEtapa ||
      this.evaluandoTurnitin ||
      this.evaluandoComite ||
      this.asignandoComite ||
      this.guardandoChecklist ||
      this.mostrarModalConfirmacionMover ||
      this.mostrarModalConfirmacionAsignacion ||
      this.mostrarModalExitoAsignacion ||
      this.mostrarModalConfirmacionTurnitin ||
      this.mostrarModalExitoTurnitin ||
      this.mostrarModalConfirmacionCertificado ||
      this.mostrarModalConfirmacionCorreccion ||
      this.mostrarModalConfirmacionRechazoCorreccion ||
      !!this.archivoObservacion ||
      !!this.archivoTurnitin ||
      !!this.archivoCertificacion ||
      !!this.archivoComite ||
      this.asuntoObservacion.trim().length > 0 ||
      this.comentarioObservacion.trim().length > 0 ||
      this.observacionTurnitin.trim().length > 0 ||
      this.observacionComite.trim().length > 0 ||
      this.comentarioAceptacionCorreccion.trim().length > 0 ||
      this.comentarioRechazoCorreccion.trim().length > 0
    );
  }

  abrirConfirmacionEvaluacionTurnitin(): void {
    if (!this.articulo || !this.puedeMostrarTurnitin || this.evaluandoTurnitin) {
      return;
    }

    if (this.articuloYaEvaluadoPorTurnitin) {
      this.accionError =
        'Este artículo ya fue evaluado en Turnitin y no admite una nueva evaluación.';
      this.accionExitosa = null;
      return;
    }

    this.accionError = null;
    this.accionExitosa = null;

    if (!this.validarFormularioTurnitin()) {
      return;
    }

    this.mostrarModalConfirmacionTurnitin = true;
  }

  cancelarConfirmacionEvaluacionTurnitin(): void {
    this.mostrarModalConfirmacionTurnitin = false;
  }

  abrirModalErrorTurnitin(mensaje: string): void {
    this.mensajeErrorTurnitin = mensaje;
    this.mostrarModalErrorTurnitin = true;
  }

  cerrarModalErrorTurnitin(): void {
    this.mostrarModalErrorTurnitin = false;
    this.mensajeErrorTurnitin = null;
  }

  cerrarModalExitoTurnitin(): void {
    this.mostrarModalExitoTurnitin = false;
    this.mensajeExitoTurnitin = '';
  }

  private validarFormularioTurnitin(): boolean {
    if (this.porcentajeTurnitin === null || this.porcentajeTurnitin === undefined) {
      this.abrirModalErrorTurnitin('Debes indicar el porcentaje de similitud.');
      return false;
    }
    const porcentaje = Number(this.porcentajeTurnitin);
    if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      this.abrirModalErrorTurnitin('El porcentaje debe ser un número entre 0 y 100.');
      return false;
    }

    // El soporte (archivo) es obligatorio en todas las evaluaciones Turnitin
    if (!this.archivoTurnitin) {
      this.abrirModalErrorTurnitin('Debes adjuntar el soporte de Turnitin.');
      return false;
    }

    // Si el porcentaje es menor o igual a 30, se debe seleccionar una decisión específica
    if ((this.porcentajeTurnitin ?? 0) <= 30 && !this.decisionTurnitin) {
      this.abrirModalErrorTurnitin(
        'Debes seleccionar una decisión: aceptado, rechazado por similitud o solicitar cambios.',
      );
      return false;
    }

    // Si se solicita cambios, solo se permite una vez
    if (this.decisionTurnitin === 'solicitar_cambios' && this.articuloYaSolicitadoCambiosTurnitin) {
      this.abrirModalErrorTurnitin(
        'Ya existe una solicitud de cambios por Turnitin para este artículo.',
      );
      return false;
    }

    if (this.archivoTurnitin && !this.esTamanoArchivoTurnitinValido(this.archivoTurnitin)) {
      this.abrirModalErrorTurnitin('El archivo de Turnitin no puede superar los 10 MB.');
      return false;
    }

    return true;
  }

  registrarEvaluacionTurnitin(): void {
    if (
      !this.articulo ||
      !this.puedeMostrarTurnitin ||
      this.evaluandoTurnitin ||
      this.articuloYaEvaluadoPorTurnitin
    ) {
      return;
    }
    if (!this.validarFormularioTurnitin()) return;

    const porcentaje = Number(this.porcentajeTurnitin);
    const fileToSend = this.archivoTurnitin;

    this.cancelarConfirmacionEvaluacionTurnitin();
    this.evaluandoTurnitin = true;

    const enviarArchivoEnEvaluacion = this.decisionTurnitin !== 'solicitar_cambios';
    const archivoParaEvaluacion = enviarArchivoEnEvaluacion ? fileToSend : undefined;

    this.articulosService
      .evaluarTurnitin(this.articulo.id, {
        porcentaje,
        observacion: this.observacionTurnitin.trim() || undefined,
        archivo: archivoParaEvaluacion,
        decision: this.decisionTurnitin || undefined,
      })
      .subscribe({
        next: (event: any) => {
          if (event.type === 1) { // HttpEventType.UploadProgress
            this.progresoTurnitin = Math.round((100 * event.loaded) / event.total!);
          } else if (event.type === 4) { // HttpEventType.Response
            const respuesta = event.body;
            this.evaluandoTurnitin = false;
            this.progresoTurnitin = 0;
            this.tituloModalExito = 'Turnitin procesado correctamente';
            this.badgeModalExito = 'Turnitin evaluado';
            this.mensajeExitoTurnitin = respuesta.message || 'Evaluación registrada.';
            this.mostrarModalExitoTurnitin = true;

            if (this.decisionTurnitin === 'solicitar_cambios') {
              const asunto = 'Solicitud de cambios por Turnitin';
              const comentarios =
                this.observacionTurnitin.trim() || 'Se solicita corrección por similitud.';
              this.articulosService
                .agregarObservacion(this.articulo!.id, {
                  asunto,
                  comentarios,
                  etapaId: 3,
                  archivo: fileToSend,
                })
                .subscribe({
                  next: () => {
                    this.cargarArticulo(this.articulo!.id);
                    this.resetTurnitinForm();
                  },
                  error: () => {
                    this.resetTurnitinForm();
                  },
                });
            } else {
              this.cargarArticulo(this.articulo!.id);
              this.resetTurnitinForm();
            }
          }
        },
        error: (err) => {
          this.evaluandoTurnitin = false;
          this.progresoTurnitin = 0;
          const mensaje = err?.error?.message ?? 'No se pudo registrar la evaluación de Turnitin.';
          this.abrirModalErrorTurnitin(mensaje);
        },
      });
  }

  abrirConfirmacionProrrogaCorreccion(decision: 'aceptar' | 'rechazar'): void {
    this.decisionProrrogaCorreccionConfirmar = decision;
    this.mostrarModalConfirmacionProrrogaCorreccion = true;
  }

  cancelarConfirmacionProrrogaCorreccion(): void {
    this.mostrarModalConfirmacionProrrogaCorreccion = false;
    this.decisionProrrogaCorreccionConfirmar = null;
  }

  confirmarResolucionProrrogaCorreccion(): void {
    if (!this.decisionProrrogaCorreccionConfirmar) {
      return;
    }
    const decision = this.decisionProrrogaCorreccionConfirmar;
    this.cancelarConfirmacionProrrogaCorreccion();
    this.resolverProrrogaCorreccion(decision);
  }

  resolverProrrogaCorreccion(decision: 'aceptar' | 'rechazar'): void {
    if (!this.articulo || !this.solicitudProrrogaCorreccionPendiente) {
      return;
    }

    this.evaluandoTurnitin = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService.resolverProrrogaCorreccion(this.articulo.id, decision).subscribe({
      next: (respuesta) => {
        this.evaluandoTurnitin = false;
        this.accionExitosa = respuesta.message;
        this.tituloModalExito = 'Prórroga procesada';
        this.badgeModalExito = 'Solicitud resuelta';
        this.mensajeExitoTurnitin = respuesta.message;
        this.mostrarModalExitoTurnitin = true;
        this.cargarArticulo(this.articulo!.id);
      },
      error: (err) => {
        this.evaluandoTurnitin = false;
        this.accionError = err?.error?.message ?? 'No se pudo resolver la solicitud de prórroga.';
      },
    });
  }

  abrirConfirmacionProrrogaComite(decision: 'aceptar' | 'rechazar'): void {
    this.decisionProrrogaComiteConfirmar = decision;
    this.mostrarModalConfirmacionProrrogaComite = true;
  }

  cancelarConfirmacionProrrogaComite(): void {
    this.mostrarModalConfirmacionProrrogaComite = false;
    this.decisionProrrogaComiteConfirmar = null;
  }

  confirmarResolucionProrrogaComite(): void {
    if (!this.decisionProrrogaComiteConfirmar) {
      return;
    }
    const decision = this.decisionProrrogaComiteConfirmar;
    this.cancelarConfirmacionProrrogaComite();
    this.resolverProrrogaComite(decision);
  }

  resolverProrrogaComite(decision: 'aceptar' | 'rechazar'): void {
    if (!this.articulo || !this.solicitudProrrogaComitePendiente) {
      return;
    }

    this.resolviendoProrrogaComite = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService.resolverProrrogaComite(this.articulo.id, decision).subscribe({
      next: (respuesta) => {
        this.resolviendoProrrogaComite = false;
        this.accionExitosa = respuesta.message;
        this.tituloModalExito = 'Prórroga procesada';
        this.badgeModalExito = 'Solicitud resuelta';
        this.mensajeExitoTurnitin = respuesta.message;
        this.mostrarModalExitoTurnitin = true;
        this.cargarArticulo(this.articulo!.id);
      },
      error: (err) => {
        this.resolviendoProrrogaComite = false;
        this.accionError = err?.error?.message ?? 'No se pudo resolver la solicitud de prórroga.';
      },
    });
  }

  abrirConfirmacionProrrogaRevisor(decision: 'aceptar' | 'rechazar'): void {
    this.decisionProrrogaRevisorConfirmar = decision;
    this.mostrarModalConfirmacionProrrogaRevisor = true;
  }

  cancelarConfirmacionProrrogaRevisor(): void {
    this.mostrarModalConfirmacionProrrogaRevisor = false;
    this.decisionProrrogaRevisorConfirmar = null;
  }

  confirmarResolucionProrrogaRevisor(): void {
    if (!this.decisionProrrogaRevisorConfirmar) {
      return;
    }
    const decision = this.decisionProrrogaRevisorConfirmar;
    this.cancelarConfirmacionProrrogaRevisor();
    this.resolverProrrogaRevisor(decision);
  }

  resolverProrrogaRevisor(decision: 'aceptar' | 'rechazar'): void {
    if (!this.articulo || !this.solicitudProrrogaRevisorPendiente) {
      return;
    }

    this.resolviendoProrrogaRevisor = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService.resolverProrrogaRevisor(this.articulo.id, decision).subscribe({
      next: (respuesta) => {
        this.resolviendoProrrogaRevisor = false;
        this.accionExitosa = respuesta.message;
        this.tituloModalExito = 'Prórroga procesada';
        this.badgeModalExito = 'Solicitud resuelta';
        this.mensajeExitoTurnitin = respuesta.message;
        this.mostrarModalExitoTurnitin = true;
        this.cargarArticulo(this.articulo!.id);
      },
      error: (err) => {
        this.resolviendoProrrogaRevisor = false;
        this.accionError = err?.error?.message ?? 'No se pudo resolver la solicitud de prórroga.';
      },
    });
  }

  get requiereSoporteCorreccionTurnitin(): boolean {
    return this.porcentajeTurnitin !== null && this.porcentajeTurnitin > 30;
  }

  private resetTurnitinForm(): void {
    this.porcentajeTurnitin = null;
    this.observacionTurnitin = '';
    this.archivoTurnitin = null;
    this.nombreArchivoTurnitin = '';
    this.decisionTurnitin = null;
  }

  get estaEnRevisionFinal(): boolean {
    return this.articulo?.etapaActual?.id === 9;
  }

  get estaEnPublicacion(): boolean {
    return this.articulo?.etapaActual?.id === 5;
  }

  get puedeMostrarRevisionFinal(): boolean {
    const etapaActualId = this.articulo?.etapaActual?.id ?? null;
    return etapaActualId === 9 && this.esAdminEditorial;
  }

  get decisionRevisionFinalGuardada(): 'aceptar' | 'rechazar' | null {
    if (!this.articulo?.observaciones) return null;
    const obs = this.articulo.observaciones;
    const tieneAprobado = obs.some(
      (o) => o.etapa?.id === 9 && (o.asunto ?? '').includes('APROBADO'),
    );
    if (tieneAprobado) return 'aceptar';

    const tieneRechazado = obs.some(
      (o) => o.etapa?.id === 9 && (o.asunto ?? '').includes('RECHAZADO'),
    );
    if (tieneRechazado) return 'rechazar';

    return null;
  }

  get isChecklistLocked(): boolean {
    return (
      this.decisionRevisionFinalGuardada !== null ||
      this.procesandoRevisionFinal ||
      (this.articulo?.revisionFinalChecklist !== null &&
        this.articulo?.revisionFinalChecklist !== undefined)
    );
  }

  get isDecisionLocked(): boolean {
    return this.decisionRevisionFinalGuardada !== null || this.procesandoRevisionFinal;
  }

  get puedeMostrarPublicacion(): boolean {
    const etapaActualId = this.articulo?.etapaActual?.id ?? null;
    const yaPublicado = this.articulo?.edicionId !== null && this.articulo?.edicionId !== undefined;
    return etapaActualId === 5 && this.esAdminEditorial && !yaPublicado;
  }

  get totalChecklistItemsCount(): number {
    return Object.keys(this.checklistRevisionFinal).length;
  }

  get completedChecklistItemsCount(): number {
    return Object.values(this.checklistRevisionFinal).filter((val) => val === true).length;
  }

  get checklistProgressPercentage(): number {
    const total = this.totalChecklistItemsCount;
    if (total === 0) return 0;
    return Math.round((this.completedChecklistItemsCount / total) * 100);
  }

  guardarChecklistFinal(): void {
    if (!this.articuloIdActual) return;
    this.guardandoChecklist = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService
      .guardarChecklistRevisionFinal(this.articuloIdActual, this.checklistRevisionFinal)
      .subscribe({
        next: (res) => {
          this.guardandoChecklist = false;
          this.tituloModalExito = 'Lista de chequeo guardada';
          this.mensajeExitoTurnitin = 'La lista de chequeo de la revisión final ha sido guardada correctamente.';
          this.badgeModalExito = 'Chequeo Guardado';
          this.mostrarModalExitoTurnitin = true;
          this.accionExitosa = res.message || 'Lista de chequeo guardada exitosamente.';
          this.cargarArticulo(this.articuloIdActual!);
        },
        error: (err) => {
          this.guardandoChecklist = false;
          this.accionError = err?.error?.message || 'Error al guardar la lista de chequeo.';
        },
      });
  }

  abrirConfirmacionDecisionRevisionFinal(): void {
    if (!this.articuloIdActual || !this.decisionRevisionFinal) return;

    if (this.decisionRevisionFinal === 'aceptar') {
      const items = [
        this.checklistRevisionFinal.ajustesRevisores,
        this.checklistRevisionFinal.cumpleNormativas,
        this.checklistRevisionFinal.resumenYSecciones,
        this.checklistRevisionFinal.numeroPaginas,
        this.checklistRevisionFinal.normasFormato,
        this.checklistRevisionFinal.referenciasBibliograficas,
        this.checklistRevisionFinal.redaccionOrtografia,
        this.checklistRevisionFinal.metadatosInglesEspanol,
      ];
      const todosListos = items.every((val) => val === true);
      if (!todosListos) {
        this.accionError = 'Todos los ítems de la lista de chequeo deben estar marcados antes de aprobar el artículo.';
        this.accionExitosa = null;
        return;
      }
    } else {
      if (!this.comentariosRevisionFinal.trim()) {
        this.accionError = 'Debes ingresar una observación explicando el motivo del rechazo del artículo.';
        this.accionExitosa = null;
        return;
      }
    }

    this.mostrarModalConfirmacionRevisionFinal = true;
  }

  cancelarConfirmacionDecisionRevisionFinal(): void {
    this.mostrarModalConfirmacionRevisionFinal = false;
  }

  confirmarDecisionRevisionFinal(): void {
    this.mostrarModalConfirmacionRevisionFinal = false;
    this.procesarDecisionRevisionFinal();
  }

  procesarDecisionRevisionFinal(): void {
    if (!this.articuloIdActual || !this.decisionRevisionFinal) return;

    if (this.decisionRevisionFinal === 'aceptar') {
      const items = [
        this.checklistRevisionFinal.ajustesRevisores,
        this.checklistRevisionFinal.cumpleNormativas,
        this.checklistRevisionFinal.resumenYSecciones,
        this.checklistRevisionFinal.numeroPaginas,
        this.checklistRevisionFinal.normasFormato,
        this.checklistRevisionFinal.referenciasBibliograficas,
        this.checklistRevisionFinal.redaccionOrtografia,
        this.checklistRevisionFinal.metadatosInglesEspanol,
      ];
      const todosListos = items.every((val) => val === true);
      if (!todosListos) {
        this.accionError = 'Todos los ítems de la lista de chequeo deben estar marcados antes de aprobar el artículo.';
        this.accionExitosa = null;
        return;
      }
    } else {
      if (!this.comentariosRevisionFinal.trim()) {
        this.accionError = 'Debes ingresar una observación explicando el motivo del rechazo del artículo.';
        this.accionExitosa = null;
        return;
      }
    }

    this.procesandoRevisionFinal = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService
      .guardarChecklistRevisionFinal(this.articuloIdActual, this.checklistRevisionFinal)
      .subscribe({
        next: () => {
          const isAceptar = this.decisionRevisionFinal === 'aceptar';
          const asuntoObs = isAceptar ? 'Revisión final: APROBADO' : 'Revisión final: RECHAZADO';
          const comentariosObs = isAceptar
            ? (this.comentariosRevisionFinal.trim() || 'El artículo ha superado con éxito la revisión final y se aprueba para su publicación.')
            : this.comentariosRevisionFinal.trim();

          this.articulosService
            .agregarObservacion(this.articuloIdActual!, {
              asunto: asuntoObs,
              comentarios: comentariosObs,
              etapaId: 9,
            })
            .subscribe({
              next: () => {
                this.procesandoRevisionFinal = false;
                this.accionExitosa = isAceptar
                  ? 'La decisión ha sido guardada. El artículo ha sido aprobado; ahora puedes avanzar a Certificación usando el botón de abajo.'
                  : 'La decisión ha sido guardada. El artículo ha sido rechazado; ahora puedes marcarlo como Descartado usando el botón de abajo.';
                this.resetFormularioRevisionFinal();
                this.cargarArticulo(this.articuloIdActual!);
              },
              error: (err) => {
                this.procesandoRevisionFinal = false;
                this.accionError = err?.error?.message || 'Error al registrar la observación de la decisión.';
              },
            });
        },
        error: (err) => {
          this.procesandoRevisionFinal = false;
          this.accionError = err?.error?.message || 'Error al guardar la lista de chequeo de la revisión final.';
        },
      });
  }

  resetFormularioRevisionFinal(): void {
    this.decisionRevisionFinal = null;
    this.comentariosRevisionFinal = '';
  }

  recargarArticulo(): void {
    if (this.articuloIdActual) {
      this.cargarArticulo(this.articuloIdActual);
    }
  }

  get esperandoCorreccionAutor(): boolean {
    if (!this.articulo || this.articulo.etapaActual.id !== 3) {
      return false;
    }

    const solicitudCorreccion = [...this.historialObservaciones]
      .filter(
        (obs) => obs.etapaId === 3 && obs.asunto === this.ASUNTO_EVALUACION_TURNITIN_CORRECCION,
      )
      .sort((a, b) => b.fechaOrden - a.fechaOrden)[0];

    if (!solicitudCorreccion) {
      return false;
    }

    const hayCorreccionPosterior = this.historialObservaciones.some(
      (obs) =>
        obs.etapaId === 3 &&
        obs.esCorreccionAutor &&
        obs.fechaOrden > solicitudCorreccion.fechaOrden,
    );

    return !hayCorreccionPosterior;
  }
}
