import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ArticulosAutorService,
  ArticuloAutor,
  NotificacionAutorBackend,
} from '../../../core/articulos/articulos-autor.service';
import { ArticulosService } from '../../../core/articulos/articulos.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { inferCorrectionState } from '../../../core/articulos/correction-notification.util';

type OrdenArticulos =
  | 'llegada-reciente'
  | 'llegada-antigua'
  | 'fecha-desc'
  | 'fecha-asc'
  | 'titulo-asc'
  | 'titulo-desc'
  | 'codigo-asc'
  | 'codigo-desc';

interface EscenarioAcciones {
  tipo: 'alerta' | 'accion' | 'informacion' | 'exito';
  titulo: string;
  descripcion: string;
  acciones: string[];
}

interface ArticuloAutorListado extends ArticuloAutor {
  fechaReferencia: Date | null;
  ordenLlegada: number;
  tiempoProceso: string;
}

@Component({
  selector: 'app-mi-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mi-panel.component.html',
  styleUrls: ['./mi-panel.component.css']
})
export class MiPanelComponent implements OnInit {
  private articulosService = inject(ArticulosAutorService);
  private articulosEditorService = inject(ArticulosService);
  private router = inject(Router);

  articulos: ArticuloAutorListado[] = [];
  loading = true;
  mensajeCorreccion: string | null = null;
  errorCorreccion: string | null = null;
  articuloCorreccionActivo: ArticuloAutor | null = null;
  archivoCorreccionActivo: File | null = null;
  nombreArchivoCorreccionActivo = '';
  comentariosCorreccionActivo = '';
  errorModalCorreccion: string | null = null;
  articuloVistaAccionesActiva: ArticuloAutor | null = null;
  notificacionesVistaAcciones: NotificacionAutorBackend[] = [];
  cargandoVistaAcciones = false;
  errorVistaAcciones: string | null = null;
  private notificacionesCache: NotificacionAutorBackend[] | null = null;
  private notificacionesPorArticulo = new Map<number, NotificacionAutorBackend[]>();
  arrastrandoArchivoCorreccion = false;
  subiendoCorreccionIds = new Set<number>();
  modalConfirmarProrrogaAutor = false;
  articuloProrrogaAutorConfirmar: ArticuloAutor | null = null;
  estadoFiltro: 'todos' | 'revision' | 'correccion' | 'publicado' = 'todos';
  ordenArticulos: OrdenArticulos = 'llegada-reciente';
  readonly hoy = new Date();
  envioHabilitado = true;
  cargandoEstadoEnvios = true;

  get totalArticulos() { return this.articulos.length; }
  get enRevision() { return this.articulos.filter(a => this.getEstadoArticulo(a) === 'revision').length; }
  get correccionPendiente() { return this.articulos.filter(a => this.getEstadoArticulo(a) === 'correccion').length; }
  get publicados() { return this.articulos.filter(a => this.getEstadoArticulo(a) === 'publicado').length; }
  get proximoVencimiento() {
    const pendientes = this.articulos
      .filter((articulo) => articulo.fecha_vencimiento_correccion)
      .map((articulo) => new Date(articulo.fecha_vencimiento_correccion as string))
      .filter((fecha) => !isNaN(fecha.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    return pendientes[0] ?? null;
  }

  get articulosFiltrados(): ArticuloAutorListado[] {
    const filtrados = this.articulos.filter((articulo) => {
      const estado = this.getEstadoArticulo(articulo);
      return this.estadoFiltro === 'todos' || estado === this.estadoFiltro;
    });

    return this.ordenarArticulos(filtrados);
  }

  ngOnInit() {
    this.cargarArticulos();
    this.cargarEstadoEnvios();
  }

  private cargarEstadoEnvios(): void {
    this.cargandoEstadoEnvios = true;

    this.articulosEditorService.getEstadoEnviosArticulos().subscribe({
      next: (estado) => {
        this.envioHabilitado = estado.habilitado;
        this.cargandoEstadoEnvios = false;
      },
      error: () => {
        this.envioHabilitado = true;
        this.cargandoEstadoEnvios = false;
      },
    });
  }

  private cargarArticulos(): void {
    this.articulosService.getMisArticulos().subscribe({
      next: (data) => {
        this.articulos = data.map((articulo, index) => this.normalizarArticulo(articulo, index));
        this.loading = false;
        this.actualizarAvisoCorreccion();
        this.cargarNotificacionesCorreccion();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  private cargarNotificacionesCorreccion(): void {
    this.articulosService
      .getMisNotificaciones()
      .pipe(catchError(() => of([] as NotificacionAutorBackend[])))
      .subscribe((notificaciones) => {
        this.notificacionesPorArticulo.clear();

        for (const item of notificaciones) {
          const actual = this.notificacionesPorArticulo.get(item.articuloId) ?? [];
          actual.push(item);
          this.notificacionesPorArticulo.set(item.articuloId, actual);
        }

        this.articulos = this.articulos.map((articulo) => ({
          ...articulo,
          correccion_pendiente: this.puedeEnviarCorreccion(articulo),
        }));

        this.actualizarAvisoCorreccion();
      });
  }

  private actualizarAvisoCorreccion(): void {
    const pendientes = this.articulos
      .filter((articulo) => articulo.correccion_pendiente && articulo.fecha_vencimiento_correccion && !this.correccionEnRevision(articulo))
      .map((articulo) => ({
        articulo,
        fechaVencimiento: new Date(articulo.fecha_vencimiento_correccion as string),
      }))
      .filter(({ fechaVencimiento }) => !isNaN(fechaVencimiento.getTime()))
      .sort((a, b) => a.fechaVencimiento.getTime() - b.fechaVencimiento.getTime());

    if (!pendientes.length) {
      this.mensajeCorreccion = null;
      return;
    }

    const primero = pendientes[0];
    const ahora = new Date();
    const diasRestantes = Math.ceil(
      (primero.fechaVencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diasRestantes >= 0) {
      this.mensajeCorreccion = `Tienes ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'} para completar la corrección del artículo ${primero.articulo.codigo}.`;
      return;
    }

    this.mensajeCorreccion = `La fecha para enviar la corrección del artículo ${primero.articulo.codigo} ha vencido.`;
  }

  setFiltro(filtro: 'todos' | 'revision' | 'correccion' | 'publicado') {
    this.estadoFiltro = filtro;
  }

  setOrdenArticulos(orden: string): void {
    if (!this.esOrdenArticulosValido(orden)) {
      return;
    }

    this.ordenArticulos = orden;
  }

  getEstadoArticulo(articulo: ArticuloAutor): 'revision' | 'correccion' | 'publicado' {
    const valor = articulo.etapa_nombre.toLowerCase();
    if (valor.includes('publicado')) {
      return 'publicado';
    }

    if (
      valor.includes('certificaci') ||
      valor.includes('final') ||
      valor.includes('comite') ||
      valor.includes('pares')
    ) {
      return 'revision';
    }

    if (articulo.correccion_pendiente || articulo.correccion_vencida || articulo.solicitud_prorroga_correccion_pendiente) {
      return 'correccion';
    }

    return 'revision';
  }

  getEstadoLabel(articulo: ArticuloAutor): string {
    const valor = articulo.etapa_nombre.toLowerCase();
    if (valor.includes('turnitin')) {
      const notifs = this.notificacionesPorArticulo.get(articulo.id) ?? [];
      const tieneAceptado = notifs.some((n) =>
        this.normalizarTexto(n.titulo).includes('aceptado sin cambios'),
      );
      if (tieneAceptado) {
        return 'Aceptado sin cambios';
      }
    }

    if (articulo.etapa_nombre.toLowerCase().includes('pares')) {
      return articulo.evaluado_pares ? 'Evaluado' : 'En Revision';
    }
    if (this.correccionEnRevision(articulo)) {
      return 'Corrección en revisión';
    }
    const estado = this.getEstadoArticulo(articulo);
    if (estado === 'publicado') return 'Publicado';
    if (articulo.correccion_vencida) return 'Plazo vencido';
    if (estado === 'correccion') {
      return 'Correccion Pendiente';
    }
    return 'En Revision';
  }

  getEtapaClass(etapa: string): string {
    const etapaNormalizada = this.normalizarTexto(etapa);

    if (etapaNormalizada.includes('revision preliminar')) {
      return 'stage--revision-preliminar';
    }

    if (etapaNormalizada.includes('turnitin')) {
      return 'stage--turnitin';
    }

    if (etapaNormalizada.includes('revision por pares')) {
      return 'stage--revision-pares';
    }

    if (etapaNormalizada.includes('certificacion')) {
      return 'stage--certificacion';
    }

    if (etapaNormalizada.includes('revision final')) {
      return 'stage--revision-final';
    }

    if (etapaNormalizada.includes('comite editorial')) {
      return 'stage--comite-editorial';
    }

    if (etapaNormalizada.includes('publicacion')) {
      return 'stage--publicacion';
    }

    return '';
  }

  private normalizarTexto(texto: string): string {
    return (texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  getEstadoClass(articulo: ArticuloAutor): string {
    if (articulo.etapa_nombre.toLowerCase().includes('pares') && articulo.evaluado_pares) {
      return 'state-published';
    }
    if (this.correccionEnRevision(articulo)) {
      return 'state-review';
    }
    const estado = this.getEstadoArticulo(articulo);
    if (estado === 'publicado') return 'state-published';
    if (estado === 'correccion') {
      return 'state-pending';
    }
    return 'state-review';
  }

  formatFecha(fecha: string | null): string {
    if (!fecha) return 'Sin fecha';
    const valor = new Date(fecha);
    if (isNaN(valor.getTime())) return 'Sin fecha';

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(valor);
  }

  private parseFecha(fecha: string | null): Date | null {
    if (!fecha) {
      return null;
    }

    const valor = new Date(fecha);
    return isNaN(valor.getTime()) ? null : valor;
  }

  private calcularTiempoProceso(fecha: Date | null): string {
    if (!fecha) {
      return '-';
    }

    const diferenciaMs = Date.now() - fecha.getTime();
    const dias = Math.max(0, Math.floor(diferenciaMs / (1000 * 60 * 60 * 24)));
    return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  }

  private normalizarArticulo(articulo: ArticuloAutor, ordenLlegada: number): ArticuloAutorListado {
    const fechaReferencia = this.parseFecha(articulo.fecha_inicio);

    return {
      ...articulo,
      fechaReferencia,
      ordenLlegada: fechaReferencia ? fechaReferencia.getTime() : ordenLlegada,
      tiempoProceso: this.calcularTiempoProceso(fechaReferencia),
    };
  }

  private ordenarArticulos(articulos: ArticuloAutorListado[]): ArticuloAutorListado[] {
    const base = [...articulos];

    base.sort((a, b) => {
      switch (this.ordenArticulos) {
        case 'llegada-antigua':
          return a.ordenLlegada - b.ordenLlegada;
        case 'fecha-desc':
          return this.compararFechas(b.fechaReferencia, a.fechaReferencia);
        case 'fecha-asc':
          return this.compararFechas(a.fechaReferencia, b.fechaReferencia);
        case 'titulo-asc':
          return a.titulo.localeCompare(b.titulo, 'es', { sensitivity: 'base' });
        case 'titulo-desc':
          return b.titulo.localeCompare(a.titulo, 'es', { sensitivity: 'base' });
        case 'codigo-asc':
          return a.codigo.localeCompare(b.codigo, 'es', { numeric: true, sensitivity: 'base' });
        case 'codigo-desc':
          return b.codigo.localeCompare(a.codigo, 'es', { numeric: true, sensitivity: 'base' });
        case 'llegada-reciente':
        default:
          return b.ordenLlegada - a.ordenLlegada;
      }
    });

    return base;
  }

  private compararFechas(fechaA: Date | null, fechaB: Date | null): number {
    if (!fechaA && !fechaB) {
      return 0;
    }

    if (!fechaA) {
      return 1;
    }

    if (!fechaB) {
      return -1;
    }

    return fechaA.getTime() - fechaB.getTime();
  }

  private esOrdenArticulosValido(orden: string): orden is OrdenArticulos {
    return [
      'llegada-reciente',
      'llegada-antigua',
      'fecha-desc',
      'fecha-asc',
      'titulo-asc',
      'titulo-desc',
      'codigo-asc',
      'codigo-desc',
    ].includes(orden);
  }

  etapaEnMayusculas(etapa: string): string {
    return etapa.toUpperCase();
  }

  irANuevoArticulo(event: Event): void {
    event.preventDefault();
    this.router.navigate(['/panel-autor/nuevo-articulo']);
  }

  verSeguimientoArticulo(articuloId: number): void {
    this.router.navigate(['/panel-autor/mi-panel/articulo', articuloId]);
  }

  cerrarVistaAcciones(): void {
    this.articuloVistaAccionesActiva = null;
    this.notificacionesVistaAcciones = [];
    this.cargandoVistaAcciones = false;
    this.errorVistaAcciones = null;
  }

  get escenarioVistaAcciones(): EscenarioAcciones | null {
    if (!this.articuloVistaAccionesActiva) {
      return null;
    }

    return this.construirEscenarioAcciones(
      this.articuloVistaAccionesActiva,
      this.notificacionesVistaAcciones,
    );
  }

  get notificacionesRecientesVistaAcciones(): NotificacionAutorBackend[] {
    return [...this.notificacionesVistaAcciones]
      .sort(
        (a, b) =>
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      )
      .slice(0, 3);
  }

  getTipoEscenarioClass(tipo: EscenarioAcciones['tipo']): string {
    if (tipo === 'alerta') {
      return 'escenario-alerta';
    }

    if (tipo === 'exito') {
      return 'escenario-exito';
    }

    if (tipo === 'accion') {
      return 'escenario-accion';
    }

    return 'escenario-info';
  }

  getAccionPrincipalLabel(articulo: ArticuloAutor): string | null {
    const escenario = this.construirEscenarioAcciones(
      articulo,
      this.notificacionesVistaAcciones,
    );

    if (escenario.tipo === 'alerta') {
      return 'Ver notificaciones';
    }

    if (this.puedeEnviarCorreccion(articulo)) {
      return 'Añadir correccion';
    }

    if (this.getEstadoArticulo(articulo) === 'publicado') {
      return 'Ver certificados';
    }

    return 'Ver notificaciones';
  }

  ejecutarAccionPrincipal(articulo: ArticuloAutor): void {
    this.cerrarVistaAcciones();

    if (this.puedeEnviarCorreccion(articulo)) {
      this.abrirModalCorreccion(articulo);
      return;
    }

    if (this.getEstadoArticulo(articulo) === 'publicado') {
      this.router.navigate(['/panel-autor/certificados']);
      return;
    }

    this.router.navigate(['/panel-autor/notificaciones']);
  }

  getFechaRelativa(fechaIso: string): string {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) {
      return 'Sin fecha';
    }

    const ahora = Date.now();
    const diffMs = Math.max(0, ahora - fecha.getTime());
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMin < 1) {
      return 'Hace unos segundos';
    }

    if (diffMin < 60) {
      return `Hace ${diffMin} min`;
    }

    if (diffHoras < 24) {
      return `Hace ${diffHoras} h`;
    }

    if (diffDias === 1) {
      return 'Ayer';
    }

    if (diffDias < 7) {
      return `Hace ${diffDias} dias`;
    }

    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private filtrarNotificacionesArticulo(
    notificaciones: NotificacionAutorBackend[],
    articuloId: number,
  ): NotificacionAutorBackend[] {
    return notificaciones.filter((item) => item.articuloId === articuloId);
  }

  private construirEscenarioAcciones(
    articulo: ArticuloAutor,
    notificaciones: NotificacionAutorBackend[],
  ): EscenarioAcciones {
    const textoNotificaciones = this.normalizar(
      notificaciones
        .map((item) => `${item.titulo} ${item.detalle}`)
        .join(' '),
    );

    const etapa = this.normalizar(articulo.etapa_nombre);

    const fueDescartado =
      etapa.includes('descart') ||
      textoNotificaciones.includes('descartado') ||
      textoNotificaciones.includes('rechazado');

    if (fueDescartado) {
      return {
        tipo: 'alerta',
        titulo: 'Articulo descartado en evaluacion editorial',
        descripcion:
          'Tu articulo no continuara en el flujo. Revisa la observacion para conocer el motivo (por ejemplo, resultado de Turnitin o decision editorial).',
        acciones: [
          'Leer el detalle de la notificacion y observacion registrada por el equipo editorial.',
          'Si aplica, preparar una nueva version para un futuro envio.',
          'Contactar al equipo editorial en caso de requerir aclaraciones.',
        ],
      };
    }

    const requiereCorreccion =
      articulo.correccion_pendiente ||
      textoNotificaciones.includes('requiere correccion') ||
      textoNotificaciones.includes('correccion pendiente');

    if (requiereCorreccion) {
      return {
        tipo: 'accion',
        titulo: 'Correccion solicitada al autor',
        descripcion:
          'El equipo editorial solicito ajustes sobre tu manuscrito. Debes cargar una nueva version para continuar en el proceso.',
        acciones: [
          'Actualizar el manuscrito con base en las observaciones recibidas.',
          'Adjuntar el archivo corregido desde el boton Añadir correccion.',
          'Incluir comentarios cortos con los cambios realizados.',
        ],
      };
    }

    if (etapa.includes('publicac')) {
      return {
        tipo: 'exito',
        titulo: 'Articulo publicado',
        descripcion:
          'Tu articulo completo el flujo editorial y ya se encuentra en estado de publicacion.',
        acciones: [
          'Consultar certificados y soportes disponibles del proceso.',
          'Revisar las notificaciones historicas del articulo.',
          'Mantener actualizada tu informacion para proximos envios.',
        ],
      };
    }

    if (etapa.includes('turnitin')) {
      const tieneNotifAceptado = notificaciones.some((n) =>
        this.normalizar(n.titulo).includes('aceptado sin cambios'),
      );
      const yaEvaluadoSinCorreccion = !articulo.correccion_pendiente && !articulo.fecha_vencimiento_correccion;

      if (tieneNotifAceptado || yaEvaluadoSinCorreccion) {
        return {
          tipo: 'exito',
          titulo: 'Turnitin: Aceptado sin cambios',
          descripcion:
            'Tu artículo fue aceptado sin cambios en la evaluación de Turnitin. El equipo editorial avanzará el artículo a la siguiente etapa.',
          acciones: [
            'Esperar el avance a la siguiente etapa.',
            'Revisar notificaciones recientes.',
          ],
        };
      }

      return {
        tipo: 'informacion',
        titulo: 'Evaluacion de similitud en Turnitin',
        descripcion:
          'El articulo esta en validacion de similitud. Si el resultado supera el umbral permitido, el sistema puede marcarlo como descartado o solicitar correccion segun la decision editorial.',
        acciones: [
          'Revisar notificaciones para conocer el resultado de Turnitin.',
          'Estar atento a solicitud de correccion o cambio de estado.',
          'Preparar ajustes en caso de requerimiento del equipo editorial.',
        ],
      };
    }

    if (etapa.includes('comite')) {
      return {
        tipo: 'informacion',
        titulo: 'Evaluacion del Comite Editorial',
        descripcion:
          'Tu articulo esta siendo evaluado por un miembro del Comite Editorial para decision de avance o rechazo.',
        acciones: [
          'Monitorear notificaciones de avance y decision del comite.',
          'Revisar observaciones registradas sobre el articulo.',
          'Mantener disponibilidad para atender posibles ajustes.',
        ],
      };
    }

    if (etapa.includes('pares')) {
      return {
        tipo: 'informacion',
        titulo: 'Revision por pares academicos',
        descripcion:
          'El manuscrito esta en evaluacion por pares. En esta etapa se emite una decision editorial de aceptacion o rechazo.',
        acciones: [
          'Esperar resultado de evaluacion de pares.',
          'Consultar notificaciones cuando el equipo editorial registre novedades.',
          'Revisar las observaciones solo si el dictamen lo indica.',
        ],
      };
    }

    if (etapa.includes('certific') || etapa.includes('revision final')) {
      return {
        tipo: 'informacion',
        titulo: 'Validaciones editoriales finales',
        descripcion:
          'El articulo se encuentra en la fase final de validaciones previas a publicacion.',
        acciones: [
          'Mantener seguimiento de notificaciones de cierre.',
          'Revisar observaciones finales del equipo editorial.',
          'Esperar confirmacion del cambio a publicacion.',
        ],
      };
    }

    return {
      tipo: 'informacion',
      titulo: 'Proceso editorial en curso',
      descripcion:
        'Tu articulo continua avanzando en el flujo editorial segun la etapa actual registrada.',
      acciones: [
        'Revisar notificaciones recientes del articulo.',
        'Consultar el timeline editorial para ver trazabilidad completa.',
        'Atender cualquier solicitud del equipo editorial.',
      ],
    };
  }

  private normalizar(texto: string): string {
    return (texto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  abrirModalCorreccion(articulo: ArticuloAutor): void {
    if (!this.puedeEnviarCorreccion(articulo) || this.isSubiendoCorreccion(articulo.id)) {
      this.errorCorreccion = articulo.correccion_vencida
        ? 'El plazo para enviar la corrección venció. Solicita una prórroga para continuar.'
        : 'La corrección ya fue enviada y está en revisión. No puedes volver a enviarla.';
      return;
    }

    this.articuloCorreccionActivo = articulo;
    this.archivoCorreccionActivo = null;
    this.nombreArchivoCorreccionActivo = '';
    this.comentariosCorreccionActivo = '';
    this.errorModalCorreccion = null;
  }

  cerrarModalCorreccion(): void {
    this.articuloCorreccionActivo = null;
    this.archivoCorreccionActivo = null;
    this.nombreArchivoCorreccionActivo = '';
    this.comentariosCorreccionActivo = '';
    this.errorModalCorreccion = null;
    this.arrastrandoArchivoCorreccion = false;
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

  private setArchivoCorreccion(file: File): void {
    const nombre = file.name.toLowerCase();
    const extensionValida = /\.(pdf|doc|docx)$/.test(nombre);

    if (!extensionValida) {
      this.archivoCorreccionActivo = null;
      this.nombreArchivoCorreccionActivo = '';
      this.errorModalCorreccion = 'Formato no permitido. Usa PDF, DOC o DOCX.';
      return;
    }

    this.archivoCorreccionActivo = file;
    this.nombreArchivoCorreccionActivo = file.name;
    this.errorModalCorreccion = null;
  }

  limpiarArchivoCorreccion(): void {
    this.archivoCorreccionActivo = null;
    this.nombreArchivoCorreccionActivo = '';
    this.errorModalCorreccion = null;
  }

  onArchivoModalCorreccionSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;

    if (!file) {
      return;
    }

    this.setArchivoCorreccion(file);
  }

  enviarCorreccionModal(): void {
    if (!this.articuloCorreccionActivo) {
      return;
    }

    if (!this.puedeEnviarCorreccion(this.articuloCorreccionActivo)) {
      this.errorModalCorreccion = this.articuloCorreccionActivo.correccion_vencida
        ? 'El plazo para enviar la corrección venció. Solicita una prórroga para continuar.'
        : 'La corrección ya fue enviada y está en revisión. No puedes volver a enviarla.';
      return;
    }

    if (!this.archivoCorreccionActivo) {
      this.errorModalCorreccion = 'Debes seleccionar un archivo para enviar la correccion.';
      return;
    }

    const articulo = this.articuloCorreccionActivo;
    const archivo = this.archivoCorreccionActivo;
    const comentarios = this.comentariosCorreccionActivo.trim();

    this.subiendoCorreccionIds.add(articulo.id);
    this.mensajeCorreccion = null;
    this.errorCorreccion = null;
    this.errorModalCorreccion = null;

    this.articulosService
      .enviarCorreccion(articulo.id, archivo, comentarios || undefined)
      .subscribe({
      next: () => {
        this.subiendoCorreccionIds.delete(articulo.id);
        this.mensajeCorreccion = 'Correccion enviada correctamente.';
        this.notificacionesCache = null;
        this.marcarCorreccionComoEnviada(articulo.id);
        this.cerrarModalCorreccion();
        this.cargarArticulos();
      },
      error: (err) => {
        console.error('Error enviando correccion:', err);
        this.subiendoCorreccionIds.delete(articulo.id);
        const mensaje = err?.error?.message ?? 'No fue posible enviar la correccion.';
        this.errorCorreccion = mensaje;
        this.errorModalCorreccion = mensaje;
      },
      });
  }

  isSubiendoCorreccion(articuloId: number): boolean {
    return this.subiendoCorreccionIds.has(articuloId);
  }

  correccionEnRevision(articulo: ArticuloAutor): boolean {
    return this.obtenerEstadoCorreccionDesdeNotificaciones(articulo.id) === 'enviada';
  }

  puedeEnviarCorreccion(articulo: ArticuloAutor): boolean {
    const valor = articulo.etapa_nombre.toLowerCase();
    if (
      !valor.includes('preliminar') &&
      !valor.includes('turnitin')
    ) {
      return false;
    }
    if (!articulo.correccion_pendiente || articulo.correccion_vencida) {
      return false;
    }

    const estadoNotificacion = this.obtenerEstadoCorreccionDesdeNotificaciones(articulo.id);
    return estadoNotificacion !== 'enviada';
  }

  puedeSolicitarProrroga(articulo: ArticuloAutor): boolean {
    return (
      (articulo.correccion_vencida ?? false) &&
      !(articulo.solicitud_prorroga_correccion_pendiente ?? false)
    );
  }

  private marcarCorreccionComoEnviada(articuloId: number): void {
    this.articulos = this.articulos.map((articulo) =>
      articulo.id === articuloId ? { ...articulo, correccion_pendiente: false } : articulo,
    );

    const notificaciones = this.notificacionesPorArticulo.get(articuloId) ?? [];
    this.notificacionesPorArticulo.set(articuloId, [
      {
        id: `local-correccion-enviada-${articuloId}-${Date.now()}`,
        articuloId,
        codigoArticulo: this.articulos.find((item) => item.id === articuloId)?.codigo ?? 'S/N',
        tituloArticulo: this.articulos.find((item) => item.id === articuloId)?.titulo ?? 'Artículo',
        titulo: 'Corrección enviada por autor',
        detalle: 'Corrección enviada al equipo editorial para validación.',
        tipo: 'informacion',
        fecha: new Date().toISOString(),
        origen: 'observacion',
        estadoCorreccion: 'enviada',
      },
      ...notificaciones,
    ]);
  }

  solicitarProrrogaCorreccion(articulo: ArticuloAutor): void {
    if (!this.puedeSolicitarProrroga(articulo)) {
      return;
    }
    this.articuloProrrogaAutorConfirmar = articulo;
    this.modalConfirmarProrrogaAutor = true;
  }

  cancelarProrrogaAutor(): void {
    this.modalConfirmarProrrogaAutor = false;
    this.articuloProrrogaAutorConfirmar = null;
  }

  confirmarProrrogaAutor(): void {
    if (!this.articuloProrrogaAutorConfirmar) return;
    const articulo = this.articuloProrrogaAutorConfirmar;
    this.modalConfirmarProrrogaAutor = false;
    this.articuloProrrogaAutorConfirmar = null;

    this.subiendoCorreccionIds.add(articulo.id);

    this.articulosService.solicitarProrrogaCorreccion(articulo.id).subscribe({
      next: () => {
        this.subiendoCorreccionIds.delete(articulo.id);
        this.mensajeCorreccion = `Solicitud de prórroga enviada para el artículo ${articulo.codigo}.`;
        this.cargarArticulos();
      },
      error: (err) => {
        this.subiendoCorreccionIds.delete(articulo.id);
        this.errorCorreccion = err?.error?.message ?? 'No fue posible solicitar la prórroga.';
      },
    });
  }

  private obtenerEstadoCorreccionDesdeNotificaciones(
    articuloId: number,
  ): 'solicitada' | 'enviada' | 'aceptada' | null {
    const notificaciones = this.notificacionesPorArticulo.get(articuloId) ?? [];
    if (!notificaciones.length) {
      return null;
    }

    const ordenadas = [...notificaciones].sort(
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
}
