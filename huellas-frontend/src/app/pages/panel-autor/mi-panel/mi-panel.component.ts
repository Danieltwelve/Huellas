import { Component, inject, OnInit } from '@angular/core';
import {
  ArticulosAutorService,
  ArticuloAutor,
  NotificacionAutorBackend,
} from '../../../core/articulos/articulos-autor.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface EscenarioAcciones {
  tipo: 'alerta' | 'accion' | 'informacion' | 'exito';
  titulo: string;
  descripcion: string;
  acciones: string[];
}

@Component({
  selector: 'app-mi-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './mi-panel.component.html',
  styleUrls: ['./mi-panel.component.css']
})
export class MiPanelComponent implements OnInit {
  private articulosService = inject(ArticulosAutorService);
  private router = inject(Router);

  articulos: ArticuloAutor[] = [];
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
  arrastrandoArchivoCorreccion = false;
  subiendoCorreccionIds = new Set<number>();
  estadoFiltro: 'todos' | 'revision' | 'correccion' | 'publicado' = 'todos';
  readonly hoy = new Date();

  get totalArticulos() { return this.articulos.length; }
  get enRevision() { return this.articulos.filter(a => this.getEstadoArticulo(a) === 'revision').length; }
  get correccionPendiente() { return this.articulos.filter(a => this.getEstadoArticulo(a) === 'correccion').length; }
  get publicados() { return this.articulos.filter(a => this.getEstadoArticulo(a) === 'publicado').length; }
  get proximoVencimiento() {
    const pendientes = this.articulos
      .filter((articulo) => articulo.correccion_pendiente && articulo.fecha_inicio)
      .map((articulo) => new Date(articulo.fecha_inicio as string))
      .filter((fecha) => !isNaN(fecha.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    return pendientes[0] ?? null;
  }

  get articulosFiltrados(): ArticuloAutor[] {
    if (this.estadoFiltro === 'todos') {
      return this.articulos;
    }

    return this.articulos.filter((articulo) => {
      const estado = this.getEstadoArticulo(articulo);
      return estado === this.estadoFiltro;
    });
  }

  ngOnInit() {
    this.cargarArticulos();
  }

  private cargarArticulos(): void {
    this.articulosService.getMisArticulos().subscribe({
      next: (data) => {
        this.articulos = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  setFiltro(filtro: 'todos' | 'revision' | 'correccion' | 'publicado') {
    this.estadoFiltro = filtro;
  }

  getEstadoArticulo(articulo: ArticuloAutor): 'revision' | 'correccion' | 'publicado' {
    if (articulo.correccion_pendiente) {
      return 'correccion';
    }

    const valor = articulo.etapa_nombre.toLowerCase();
    if (valor.includes('publicado')) return 'publicado';
    return 'revision';
  }

  getEstadoLabel(articulo: ArticuloAutor): string {
    const estado = this.getEstadoArticulo(articulo);
    if (estado === 'publicado') return 'Publicado';
    if (estado === 'correccion') return 'Correccion Pendiente';
    return 'En Revision';
  }

  getEtapaClass(etapa: string): string {
    const valor = etapa.toLowerCase();
    if (valor.includes('publicado')) return 'badge-green';
    if (valor.includes('correccion')) return 'badge-orange';
    if (valor.includes('evaluacion') || valor.includes('revision')) return 'badge-yellow';
    return 'badge-blue';
  }

  getEstadoClass(articulo: ArticuloAutor): string {
    const estado = this.getEstadoArticulo(articulo);
    if (estado === 'publicado') return 'state-published';
    if (estado === 'correccion') return 'state-pending';
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

    if (articulo.correccion_pendiente) {
      return 'Añadir correccion';
    }

    if (this.getEstadoArticulo(articulo) === 'publicado') {
      return 'Ver certificados';
    }

    return 'Ver notificaciones';
  }

  ejecutarAccionPrincipal(articulo: ArticuloAutor): void {
    this.cerrarVistaAcciones();

    if (articulo.correccion_pendiente) {
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
          'Tu articulo no continuara en el flujo. Revisa la observacion para conocer el motivo (por ejemplo, resultado de Turniting o decision editorial).',
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
      textoNotificaciones.includes('correccion enviada por autor') ||
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

    if (etapa.includes('turniting')) {
      return {
        tipo: 'informacion',
        titulo: 'Evaluacion de similitud en Turniting',
        descripcion:
          'El articulo esta en validacion de similitud. Si el resultado supera el umbral permitido, el sistema puede marcarlo como descartado o solicitar correccion segun la decision editorial.',
        acciones: [
          'Revisar notificaciones para conocer el resultado de Turniting.',
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
          'El manuscrito esta en evaluacion por pares. En esta etapa pueden generarse recomendaciones para ajustes.',
        acciones: [
          'Esperar resultado de evaluacion de pares.',
          'Consultar notificaciones cuando el equipo editorial registre novedades.',
          'Preparar respuesta si se solicitan correcciones.',
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
    if (!articulo.correccion_pendiente || this.isSubiendoCorreccion(articulo.id)) {
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
}
