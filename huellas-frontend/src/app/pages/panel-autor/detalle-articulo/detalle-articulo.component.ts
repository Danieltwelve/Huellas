import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import {
  ArticuloFlujo,
  ArticulosService,
  ObservacionBackend,
} from '../../../core/articulos/articulos.service';
import {
  ArticuloAutor,
  ArticulosAutorService,
  NotificacionAutorBackend,
} from '../../../core/articulos/articulos-autor.service';
import { inferCorrectionState } from '../../../core/articulos/correction-notification.util';
import { normalizarNombreArchivo } from '../../../core/utils/filename.utils';

interface EtapaVista {
  id: number;
  titulo: string;
  descripcion: string;
  estado: 'completada' | 'actual' | 'pendiente';
  fecha: string;
}

interface EscenarioAutor {
  tipo: 'alerta' | 'accion' | 'informacion' | 'exito';
  titulo: string;
  detalle: string;
  acciones: string[];
}

@Component({
  selector: 'app-detalle-articulo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './detalle-articulo.component.html',
  styleUrls: ['./detalle-articulo.component.css'],
})
export class DetalleArticuloComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly articulosService = inject(ArticulosService);
  private readonly articulosAutorService = inject(ArticulosAutorService);

  loading = true;
  error: string | null = null;

  articulo: ArticuloFlujo | null = null;
  resumenAutor: ArticuloAutor | null = null;
  notificacionesArticulo: NotificacionAutorBackend[] = [];

  archivoCorreccion: File | null = null;
  nombreArchivoCorreccion = '';
  comentariosCorreccion = '';
  enviandoCorreccion = false;
  mensajeCorreccion: string | null = null;
  errorCorreccion: string | null = null;
  mostrarModalConfirmacionCorreccion = false;
  resumenEnvioExpandido = true;
  arrastrandoArchivoCorreccion = false;

  private readonly etapasBase: Array<{ id: number; titulo: string; descripcion: string }> = [
    { id: 1, titulo: 'Revisión preliminar', descripcion: 'Validación editorial inicial del envío' },
    { id: 6, titulo: 'Comité Editorial', descripcion: 'Revisión del artículo por un miembro del comité' },
    { id: 3, titulo: 'Turnitin', descripcion: 'Validación de originalidad y similitud' },
    { id: 4, titulo: 'Revisión por pares', descripcion: 'Evaluación por revisores académicos' },
    { id: 9, titulo: 'Revisión final', descripcion: 'Revisión integral previa a publicación' },
    { id: 8, titulo: 'Certificación', descripcion: 'Verificación documental y editorial' },
    { id: 5, titulo: 'Publicación', descripcion: 'Preparación y salida en volumen activo' },
  ];

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (isNaN(id) || id <= 0) {
        this.error = 'ID de artículo inválido.';
        this.loading = false;
        return;
      }

      this.cargarDetalle(id);
    });
  }

  get etapaActualLabel(): string {
    if (!this.articulo?.etapaActual?.nombre) {
      return 'SIN ETAPA';
    }

    return this.articulo.etapaActual.nombre.toUpperCase();
  }

  get tituloArticulo(): string {
    if (!this.articulo) {
      return 'Cargando artículo...';
    }

    return `${this.articulo.codigo} - ${this.articulo.titulo}`;
  }

  get autoresTexto(): string {
    const autores = this.articulo?.autores ?? [];
    return autores.length ? autores.map((item) => item.nombre).join(', ') : 'Sin autores';
  }

  get temasTexto(): string {
    const temas = this.articulo?.temas ?? [];
    return temas.length ? temas.join(', ') : 'Sin temas';
  }

  get palabrasClaveTexto(): string {
    const palabras = this.articulo?.palabrasClave ?? [];
    return palabras.length ? palabras.join(', ') : 'Sin palabras clave';
  }

  get fechaEnvioTexto(): string {
    if (!this.articulo?.fechaEnvio) {
      return 'Sin fecha registrada';
    }

    const fecha = new Date(this.articulo.fechaEnvio);
    if (isNaN(fecha.getTime())) {
      return 'Sin fecha registrada';
    }

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeZone: 'America/Bogota',
    }).format(fecha);
  }

  toggleResumenEnvio(): void {
    this.resumenEnvioExpandido = !this.resumenEnvioExpandido;
  }

  get etapas(): EtapaVista[] {
    if (!this.articulo) {
      return [];
    }

    const fechasPorEtapa = new Map<number, string>();
    for (const h of this.articulo.historialEtapas ?? []) {
      if (!fechasPorEtapa.has(h.etapaId)) {
        fechasPorEtapa.set(h.etapaId, h.fechaInicio);
      }
    }

    return this.etapasBase.map((etapa) => {
      const fecha = fechasPorEtapa.get(etapa.id);
      let estado: 'completada' | 'actual' | 'pendiente' = 'pendiente';

      if (this.articulo?.etapaActual?.id === etapa.id) {
        estado = 'actual';
      } else if (fechasPorEtapa.has(etapa.id)) {
        estado = 'completada';
      }

      return {
        id: etapa.id,
        titulo: etapa.titulo,
        descripcion: etapa.descripcion,
        estado,
        fecha: fecha ? this.formatearFechaCorta(fecha) : 'Por definir',
      };
    });
  }

  get historial(): ObservacionBackend[] {
    const list = [...(this.articulo?.observaciones ?? [])].sort(
      (a, b) => new Date(b.fechaSubida).getTime() - new Date(a.fechaSubida).getTime(),
    );
    return list.map((obs) => ({
      ...obs,
      asunto: obs.asunto
        ? obs.asunto
            .replace(/revisi[oó]n por pares:\s*ajustes/gi, 'Revisión por pares: ACEPTAR')
            .replace(/revisi[oó]n por pares completada:\s*ajustes/gi, 'Revisión por pares completada: APROBADO')
        : obs.asunto,
    }));
  }

  get escenarioActual(): EscenarioAutor {
    const etapa = this.normalizar(this.articulo?.etapaActual?.nombre ?? '');
    const texto = this.normalizar(this.notificacionesArticulo.map((n) => `${n.titulo} ${n.detalle}`).join(' '));

    const descartado =
      etapa.includes('descart') ||
      texto.includes('descartado') ||
      texto.includes('rechazado por el comite') ||
      texto.includes('evaluacion de turnitin: descartado');

    if (descartado) {
      return {
        tipo: 'alerta',
        titulo: 'Artículo descartado',
        detalle:
          'El artículo fue descartado en el proceso editorial. Revisa las observaciones para conocer el motivo específico.',
        acciones: [
          'Leer la observación del equipo editorial.',
          'Registrar los ajustes para una futura postulación.',
          'Contactar al equipo editorial si necesitas aclaración.',
        ],
      };
    }

    const valor = etapa.toLowerCase();
    const esEtapaConCorreccion = valor.includes('preliminar') || valor.includes('turnitin');
    const correccionPendiente = esEtapaConCorreccion && this.resumenAutor?.correccion_pendiente === true;
    const estadoCorreccion = this.obtenerEstadoCorreccionDesdeNotificaciones();

    if (correccionPendiente && estadoCorreccion !== 'enviada') {
      return {
        tipo: 'accion',
        titulo: 'Corrección requerida del autor',
        detalle:
          'Debes enviar una nueva versión del artículo para continuar el flujo editorial.',
        acciones: [
          'Actualizar el artículo según observaciones.',
          'Subir el archivo corregido desde esta página.',
          'Agregar un comentario breve sobre los cambios.',
        ],
      };
    }

    if (estadoCorreccion === 'enviada') {
      return {
        tipo: 'informacion',
        titulo: 'Corrección enviada al equipo editorial',
        detalle:
          'La corrección ya fue enviada y está en revisión. Te notificaremos cuando cambie el estado.',
        acciones: [
          'Revisar notificaciones recientes del artículo.',
          'Esperar validación del equipo editorial.',
          'No volver a enviar la corrección hasta nueva solicitud.',
        ],
      };
    }

    if (etapa.includes('publicac')) {
      return {
        tipo: 'exito',
        titulo: 'Artículo publicado',
        detalle: 'Tu artículo ya completó el flujo editorial y se encuentra publicado.',
        acciones: [
          'Consultar certificados del proceso.',
          'Revisar notificaciones históricas del artículo.',
          'Conservar trazabilidad para próximos envíos.',
        ],
      };
    }

    if (etapa.includes('turnitin')) {
      const esAceptadoSinCambios = this.historial.some((obs) => {
        if (!this.esObservacionTurnitin(obs)) {
          return false;
        }
        const textoObs = this.normalizar(obs.asunto ?? '');
        return textoObs.includes('aceptado sin cambios');
      });

      const yaEvaluadoSinCorreccion = !this.resumenAutor?.correccion_pendiente && !this.articulo?.fechaVencimientoCorreccion;

      if (esAceptadoSinCambios || yaEvaluadoSinCorreccion) {
        return {
          tipo: 'exito',
          titulo: 'Evaluación de Turnitin: Aceptado sin cambios',
          detalle:
            'Tu artículo fue aceptado sin cambios en la validación de originalidad y similitud de Turnitin. El monitor pronto avanzará el artículo a la siguiente etapa.',
          acciones: [
            'Monitorear el avance a la siguiente etapa.',
            'Verificar notificaciones recientes.',
          ],
        };
      }

      return {
        tipo: 'informacion',
        titulo: 'Evaluación de Turnitin en curso',
        detalle:
          'El equipo editorial está validando similitud y originalidad del artículo. El resultado definirá si continúa, requiere corrección o se descarta.',
        acciones: [
          'Monitorear observaciones recientes.',
          'Estar atento a solicitud de corrección.',
          'Preparar versión ajustada en caso de requerimiento.',
        ],
      };
    }

    if (etapa.includes('comite')) {
      return {
        tipo: 'informacion',
        titulo: 'Revisión por Comité Editorial',
        detalle: 'Tu artículo está en decisión del Comité Editorial.',
        acciones: [
          'Revisar notificaciones de avance.',
          'Esperar concepto de comité.',
          'Atender solicitudes adicionales si aparecen.',
        ],
      };
    }

    return {
      tipo: 'informacion',
      titulo: 'Proceso editorial en curso',
      detalle: 'Tu artículo continúa su flujo editorial según la etapa actual.',
      acciones: [
        'Consultar el historial de observaciones.',
        'Verificar notificaciones recientes del artículo.',
        'Mantenerte atento a nuevas solicitudes.',
      ],
    };
  }

  get mostrarFormularioCorreccion(): boolean {
    const etapa = this.normalizar(this.articulo?.etapaActual?.nombre ?? '');
    const valor = etapa.toLowerCase();
    const esEtapaConCorreccion = valor.includes('preliminar') || valor.includes('turnitin');
    const correccionPendiente = esEtapaConCorreccion && this.resumenAutor?.correccion_pendiente === true;
    return correccionPendiente && this.obtenerEstadoCorreccionDesdeNotificaciones() !== 'enviada';
  }

  volverAtras(): void {
    // Navegar al listado del autor para mantener la misma experiencia visual
    this.router.navigate(['/panel-autor/mi-panel']);
  }

  private setArchivoCorreccion(file: File): void {
    const extensionValida = /\.(pdf|doc|docx)$/i.test(file.name);
    if (!extensionValida) {
      this.errorCorreccion = 'Formato no permitido. Usa PDF, DOC o DOCX.';
      this.archivoCorreccion = null;
      this.nombreArchivoCorreccion = '';
      return;
    }

    this.archivoCorreccion = file;
    this.nombreArchivoCorreccion = file.name;
    this.errorCorreccion = null;
  }

  onArchivoCorreccionSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;

    if (!file) {
      return;
    }

    this.setArchivoCorreccion(file);
  }

  onDragOverCorreccion(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoCorreccion = true;
  }

  onDragLeaveCorreccion(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoCorreccion = false;
  }

  onDropArchivoCorreccion(event: DragEvent): void {
    event.preventDefault();
    this.arrastrandoArchivoCorreccion = false;

    const file = event.dataTransfer?.files?.item(0) ?? null;
    if (!file) {
      return;
    }

    this.setArchivoCorreccion(file);
  }

  limpiarArchivoCorreccion(): void {
    this.archivoCorreccion = null;
    this.nombreArchivoCorreccion = '';
    this.errorCorreccion = null;
  }

  enviarCorreccion(): void {
    if (!this.mostrarFormularioCorreccion) {
      this.errorCorreccion =
        'La corrección ya fue enviada y está en revisión. No puedes volver a enviarla.';
      return;
    }

    if (!this.articulo?.id) {
      return;
    }

    if (!this.archivoCorreccion) {
      this.errorCorreccion = 'Debes adjuntar el archivo de corrección.';
      return;
    }

    this.errorCorreccion = null;
    this.mostrarModalConfirmacionCorreccion = true;
  }

  cancelarConfirmacionCorreccion(): void {
    this.mostrarModalConfirmacionCorreccion = false;
  }

  confirmarEnvioCorreccion(): void {
    if (!this.mostrarFormularioCorreccion) {
      this.errorCorreccion =
        'La corrección ya fue enviada y está en revisión. No puedes volver a enviarla.';
      this.mostrarModalConfirmacionCorreccion = false;
      return;
    }

    if (!this.articulo?.id || !this.archivoCorreccion) {
      this.mostrarModalConfirmacionCorreccion = false;
      return;
    }

    this.mostrarModalConfirmacionCorreccion = false;

    this.enviandoCorreccion = true;
    this.errorCorreccion = null;
    this.mensajeCorreccion = null;

    this.articulosAutorService
      .enviarCorreccion(
        this.articulo.id,
        this.archivoCorreccion,
        this.comentariosCorreccion.trim() || undefined,
      )
      .subscribe({
        next: () => {
          this.enviandoCorreccion = false;
          this.mensajeCorreccion = 'Corrección enviada correctamente.';
          this.resumenAutor = this.resumenAutor
            ? { ...this.resumenAutor, correccion_pendiente: false }
            : this.resumenAutor;
          this.archivoCorreccion = null;
          this.nombreArchivoCorreccion = '';
          this.comentariosCorreccion = '';
          this.cargarDetalle(this.articulo!.id);
        },
        error: (err) => {
          console.error('Error enviando corrección:', err);
          this.enviandoCorreccion = false;
          this.errorCorreccion =
            err?.error?.message ?? 'No fue posible enviar la corrección.';
        },
      });
  }

  descargarArchivo(path: string, nombreOriginal: string): void {
    const filename = path.split(/[\\/]/).pop() || '';
    if (!filename) {
      return;
    }

    this.articulosService.descargarArchivo(filename).subscribe({
      next: (blob) => {
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
      },
    });
  }

  getEscenarioClass(tipo: EscenarioAutor['tipo']): string {
    if (tipo === 'alerta') {
      return 'escenario-alerta';
    }

    if (tipo === 'accion') {
      return 'escenario-accion';
    }

    if (tipo === 'exito') {
      return 'escenario-exito';
    }

    return 'escenario-info';
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

  formatearFechaHistorial(fechaIso: string): string {
    return this.formatearFechaExacta(fechaIso, false) || 'Sin fecha';
  }

  esObservacionTurnitin(obs: ObservacionBackend): boolean {
    const texto = this.normalizar(`${obs.asunto ?? ''} ${obs.etapa?.nombre ?? ''}`);
    return texto.includes('turnitin');
  }

  obtenerPorcentajeTurnitin(obs: ObservacionBackend): string | null {
    const fuente = `${obs.asunto ?? ''} ${obs.comentarios ?? ''}`;
    const match = fuente.match(/(\d+(?:[\.,]\d+)?)\s*%/);

    if (!match) {
      return null;
    }

    const valor = Number(match[1].replace(',', '.'));
    if (!Number.isFinite(valor)) {
      return null;
    }

    return `${valor % 1 === 0 ? valor.toFixed(0) : valor.toFixed(1)}%`;
  }

  textoSimilitudTurnitin(obs: ObservacionBackend): string {
    return this.obtenerPorcentajeTurnitin(obs) ?? 'No registrada';
  }


  private cargarDetalle(articuloId: number): void {
    this.loading = true;
    this.error = null;

    forkJoin({
      flujo: this.articulosService.getArticuloFlujo(articuloId),
      notificaciones: this.articulosAutorService.getMisNotificaciones().pipe(
        catchError(() => of([] as NotificacionAutorBackend[])),
      ),
      resumen: this.articulosAutorService.getMisArticulos().pipe(
        catchError(() => of([] as ArticuloAutor[])),
      ),
    }).subscribe({
      next: ({ flujo, notificaciones, resumen }) => {
        this.articulo = flujo;
        this.notificacionesArticulo = notificaciones.filter((item) => item.articuloId === articuloId);
        this.resumenAutor = resumen.find((item) => item.id === articuloId) ?? null;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando detalle del artículo:', err);
        this.error = 'No fue posible cargar la información del artículo.';
        this.loading = false;
      },
    });
  }

  private obtenerEstadoCorreccionDesdeNotificaciones(): 'solicitada' | 'enviada' | 'aceptada' | null {
    if (!this.notificacionesArticulo.length) {
      return null;
    }

    const ordenadas = [...this.notificacionesArticulo].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );

    for (const notificacion of ordenadas) {
      const estado = inferCorrectionState(notificacion);
      if (estado) {
        return estado;
      }
    }

    return null;
  }

  private formatearFechaCorta(fechaIso: string): string {
    const valor = this.formatearFechaExacta(fechaIso, false);
    return valor || 'Por definir';
  }

  private formatearFechaExacta(fechaIso: string, incluirHora = true): string | null {
    const valor = (fechaIso ?? '').trim();
    if (!valor) {
      return null;
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
        const hour24 = Number(match[4]);
        const minute = Number(match[5]);

        const fecha = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
        if (!incluirHora) {
          return fecha;
        }

        const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
        const periodo = hour24 >= 12 ? 'p. m.' : 'a. m.';
        return `${fecha}, ${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${periodo}`;
      }
    }

    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(incluirHora
        ? {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Bogota',
          }
        : {}),
    }).format(fecha);
  }

  private normalizar(texto: string): string {
    return (texto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
