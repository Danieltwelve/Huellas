import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import {
  ArticuloFlujo,
  ArticulosService,
  ObservacionBackend,
} from '../../../../core/articulos/articulos.service';
import { ActivatedRoute } from '@angular/router';
import { normalizarNombreArchivo } from '../../../../core/utils/filename.utils';
import { AuthService } from '../../../../core/auth/auth.service';
import { UsersService, UsuarioBackend } from '../../../../core/users/users.service';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './flujo-trabajo-articulo.html',
  styleUrl: './flujo-trabajo-articulo.css',
  standalone: true,
})
export class FlujoTrabajoArticulo {
  private readonly route = inject(ActivatedRoute);
  private readonly articulosService = inject(ArticulosService);
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly autoRefreshMs = 12000;
  private articuloIdActual: number | null = null;
  private autoRefreshSubscription: Subscription | null = null;

  private static readonly ETAPA_REVISION_PRELIMINAR = 1;
  private static readonly ETAPA_COMITE_EDITORIAL = 6;

  articulo: ArticuloFlujo | null = null;
  loading = true;
  error: string | null = null;
  accionExitosa: string | null = null;
  accionError: string | null = null;
  aceptandoCorreccionIds = new Set<number>();

  guardandoObservacion = false;
  moviendoEtapa = false;
  evaluandoTurniting = false;
  porcentajeTurniting: number | null = null;
  observacionTurniting = '';
  archivoTurniting: File | null = null;
  nombreArchivoTurniting = '';
  evaluandoComite = false;
  decisionComite: 'aceptar' | 'rechazar' = 'aceptar';
  observacionComite = '';
  archivoComite: File | null = null;
  nombreArchivoComite = '';
  committeeMembers: UsuarioBackend[] = [];
  committeeMemberSeleccionadoId: number | null = null;
  asignandoComite = false;

  asuntoObservacion = '';
  comentarioObservacion = '';
  archivoObservacion: File | null = null;
  nombreArchivoObservacion = '';
  etapaSeleccionadaId: number | null = null;
  etapaMoverSeleccionadaId: number | null = null;
  mostrarModalConfirmacionMover = false;
  etapaDestinoConfirmacion: EtapaFlujo | null = null;
  mostrarModalConfirmacionAsignacion = false;
  miembroComiteConfirmacion: UsuarioBackend | null = null;
  mostrarModalExitoAsignacion = false;
  mensajeExitoAsignacion = '';

  tituloArticulo = 'Cargando...';

  private readonly ordenEtapasFlujo: number[] = [1, 6, 3, 4, 8, 9, 5];

  readonly etapasDisponibles: EtapaFlujo[] = [
    { id: 1, titulo: 'Revisión Preliminar', activa: false },
    { id: 6, titulo: 'Comité Editorial', activa: false },
    { id: 3, titulo: 'Turniting', activa: false },
    { id: 4, titulo: 'Revisión por pares', activa: false },
    { id: 8, titulo: 'Certificación', activa: false },
    { id: 9, titulo: 'Revisión final', activa: false },
    { id: 5, titulo: 'Publicación', activa: false },
  ];

  private readonly etapasDescripciones: Map<number, string> = new Map([
    [1, 'Validación editorial inicial del envío'],
    [6, 'Revisión del artículo por un miembro del Comité Editorial'],
    [3, 'Validación de originalidad y similitud (65% o menos)'],
    [4, 'Evaluación por revisores académicos'],
    [8, 'Verificación de cumplimiento documental y editorial'],
    [9, 'Revisión final de consistencia antes de publicar'],
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
    this.detenerAutoRefresh();
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
        this.etapaSeleccionadaId = data.etapaActual.id;
        this.etapaMoverSeleccionadaId = this.etapaSiguientePermitida?.id ?? null;
        this.committeeMemberSeleccionadoId = data.comiteEditorial?.id ?? this.committeeMemberSeleccionadoId;
        this.historialObservaciones = this.mapearObservacionesAHistorial(data.observaciones);
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

  cargarArticulo(id: number): void {
    this.loading = true;
    this.articulosService.getArticuloFlujo(id).subscribe({
      next: (data) => {
        this.articulo = data;
        this.tituloArticulo = `${data.codigo} - ${data.titulo}`;
        this.actualizarEtapaActual(data.etapaActual.id);
        this.etapaSeleccionadaId = data.etapaActual.id;
        this.etapaMoverSeleccionadaId = this.etapaSiguientePermitida?.id ?? null;
        this.mostrarModalConfirmacionMover = false;
        this.etapaDestinoConfirmacion = null;
        this.mostrarModalConfirmacionAsignacion = false;
        this.miembroComiteConfirmacion = null;
        this.committeeMemberSeleccionadoId = data.comiteEditorial?.id ?? this.committeeMemberSeleccionadoId;
        this.historialObservaciones = this.mapearObservacionesAHistorial(data.observaciones);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar artículo:', err);
        this.error = 'Error al cargar los datos del artículo';
        this.loading = false;
      },
    });
  }

  private actualizarEtapaActual(etapaActualId: number): void {
    this.etapas = this.etapasDisponibles.map((etapa) => ({
      ...etapa,
      activa: etapa.id === etapaActualId,
    }));
  }

  private mapearObservacionesAHistorial(observaciones: ObservacionBackend[] = []): RegistroFlujo[] {
    const historial = observaciones
      .map<RegistroFlujo>((obs) => {
        const fecha = new Date(obs.fechaSubida);
        const esCorreccionAutor = this.esAsuntoCorreccionAutor(obs.asunto ?? '');

        return {
          id: obs.id,
          etapaId: obs.etapa?.id,
          fechaOrden: fecha.getTime(),
          fecha: this.formatearFecha(obs.fechaSubida),
          autor: obs.usuario?.nombre ?? 'Usuario desconocido',
          rol: obs.usuario?.roles[0]?.nombre ?? 'Sin rol',
          asunto: obs.asunto,
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

  toggleRegistro(registro: RegistroFlujo): void {
    registro.expandido = !registro.expandido;
  }

  private formatearFecha(fechaValor: string | Date): string {
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
        const hour24 = Number(match[4]);
        const minute = Number(match[5]);
        const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
        const periodo = hour24 >= 12 ? 'p. m.' : 'a. m.';
        const dia = String(day).padStart(2, '0');
        const hora = String(hour12).padStart(2, '0');
        const minutos = String(minute).padStart(2, '0');
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

        return `${dia} ${meses[Math.max(0, month - 1)]} ${year}, ${hora}:${minutos} ${periodo}`;
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
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Bogota',
    }).format(fecha);
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

    const confirmado = window.confirm(
      '¿Deseas marcar como aceptada la corrección enviada por el autor?',
    );

    if (!confirmado) {
      return;
    }

    const comentarios =
      window.prompt(
        'Comentario opcional para el autor (puedes dejarlo vacío):',
      ) ?? undefined;

    this.aceptarCorreccionAutor(registro, comentarios);
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
      (texto.includes('acept') || texto.includes('rechaz'))
    );
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

  seleccionarEtapa(etapaId: number): void {
    if (!etapaId) {
      this.etapaSeleccionadaId = null;
      return;
    }

    if (this.soloPuedeMoverAComiteEnPreliminar) {
      this.etapaSeleccionadaId =
        etapaId === FlujoTrabajoArticulo.ETAPA_COMITE_EDITORIAL
          ? etapaId
          : FlujoTrabajoArticulo.ETAPA_COMITE_EDITORIAL;
      return;
    }

    this.etapaSeleccionadaId = etapaId;
  }

  onArchivoObservacionSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;

    this.archivoObservacion = file;
    this.nombreArchivoObservacion = file?.name ?? '';
  }

  onArchivoComiteSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;

    this.archivoComite = file;
    this.nombreArchivoComite = file?.name ?? '';
  }

  onArchivoTurnitingSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;

    this.archivoTurniting = file;
    this.nombreArchivoTurniting = file?.name ?? '';
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
          const nombreMiembro = this.miembroComiteSeleccionado?.nombre ?? 'el integrante seleccionado';
          this.mensajeExitoAsignacion = `Se asigno correctamente ${nombreMiembro} al Comite Editorial.`;
          this.mostrarModalExitoAsignacion = true;
          this.cargarArticulo(this.articulo!.id);
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
      this.accionError =
        'Debes escribir una observación cuando rechazas un artículo.';
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
        next: (respuesta) => {
          this.evaluandoComite = false;
          this.observacionComite = '';
          this.archivoComite = null;
          this.nombreArchivoComite = '';
          this.accionExitosa =
            respuesta.message || 'Evaluación de comité editorial registrada.';
          this.cargarArticulo(this.articulo!.id);
        },
        error: (err) => {
          this.evaluandoComite = false;
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
        etapaId: this.etapaSeleccionadaId ?? this.articulo.etapaActual.id,
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

    this.etapaDestinoConfirmacion = etapaSiguiente;
    this.mostrarModalConfirmacionMover = true;
  }

  cancelarConfirmacionMoverArticulo(): void {
    this.mostrarModalConfirmacionMover = false;
    this.etapaDestinoConfirmacion = null;
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

    this.cancelarConfirmacionMoverArticulo();
    this.moviendoEtapa = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService.moverEtapa(this.articulo.id, this.etapaMoverSeleccionadaId).subscribe({
      next: () => {
        this.moviendoEtapa = false;
        this.accionExitosa = 'Etapa actualizada correctamente.';
        this.cargarArticulo(this.articulo!.id);
      },
      error: (err) => {
        console.error('Error al mover etapa:', err);
        this.moviendoEtapa = false;
        this.accionError = err?.error?.message ?? 'No se pudo mover el artículo de etapa.';
      },
    });
  }

  get resumenArticulo(): string {
    return this.articulo?.resumen ?? 'Sin resumen';
  }

  get temasArticulo(): string {
    if (!this.articulo?.temas?.length) {
      return 'Sin temas registrados';
    }

    return this.articulo.temas.join(', ');
  }

  get palabrasClaveArticulo(): string {
    if (!this.articulo?.palabrasClave?.length) {
      return 'Sin palabras clave';
    }

    return this.articulo.palabrasClave.join(', ');
  }

  get autoresArticulo(): string {
    if (!this.articulo?.autores?.length) {
      return 'Sin autores registrados';
    }

    return this.articulo.autores.map((autor) => autor.nombre).join(', ');
  }

  get fechaEnvioArticulo(): string {
    if (!this.articulo?.fechaEnvio) {
      return 'Sin fecha de envío';
    }

    return this.formatearFecha(new Date(this.articulo.fechaEnvio));
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
    const documentos = this.historialVisible.flatMap((registro) =>
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

    const etapaActualId = this.articulo?.etapaActual?.id;
    return etapaActualId === FlujoTrabajoArticulo.ETAPA_REVISION_PRELIMINAR;
  }

  get puedeMostrarTurniting(): boolean {
    return this.articulo?.etapaActual?.id === 3 && this.authService.hasAnyRole(['admin', 'director', 'monitor']);
  }

  get puedeMostrarAsignacionComite(): boolean {
    return (
      this.puedeAsignarComite &&
      this.articulo?.etapaActual?.id === FlujoTrabajoArticulo.ETAPA_COMITE_EDITORIAL
    );
  }

  get articuloYaEvaluadoPorComite(): boolean {
    return this.historialVisible.some((registro) =>
      registro.etapaId === FlujoTrabajoArticulo.ETAPA_COMITE_EDITORIAL &&
      this.esAsuntoEvaluacionComite(registro.asunto),
    );
  }

  get resultadoEvaluacionComite(): 'aceptado' | 'rechazado' | null {
    const evaluacionComite = this.historialVisible.find(
      (registro) =>
        registro.etapaId === FlujoTrabajoArticulo.ETAPA_COMITE_EDITORIAL &&
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

  get mensajeResultadoComite(): string {
    if (this.resultadoEvaluacionComite === 'aceptado') {
      return 'Comité Editorial aprobó el artículo. El equipo editorial (admin/director/monitor) ya puede moverlo a la siguiente etapa.';
    }

    if (this.resultadoEvaluacionComite === 'rechazado') {
      return 'Comité Editorial rechazó el artículo. El artículo queda rechazado y no debe avanzar de etapa.';
    }

    return '';
  }

  get puedeMostrarEvaluacionComite(): boolean {
    return (
      this.esComiteEditorial &&
      this.estaEnEtapaComite &&
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

    if (
      this.estaEnEtapaComite &&
      this.resultadoEvaluacionComite !== 'aceptado'
    ) {
      return null;
    }

    const etapaActualId = this.articulo?.etapaActual?.id;
    if (!etapaActualId) {
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

  get mensajeReglaMovimiento(): string {
    if (this.resultadoEvaluacionComite === 'rechazado') {
      return 'El artículo fue rechazado por Comité Editorial y no puede avanzar de etapa.';
    }

    if (this.estaEnEtapaComite && this.resultadoEvaluacionComite !== 'aceptado') {
      return 'Antes de mover a Turniting, el Comité Editorial debe evaluar y remitir la decisión del artículo.';
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
    return 'Asignar al comité';
  }

  get puedeAsignarComiteInicial(): boolean {
    return !this.articulo?.comiteEditorial;
  }

  get debePausarAutoRefresh(): boolean {
    return (
      this.loading ||
      this.guardandoObservacion ||
      this.moviendoEtapa ||
      this.evaluandoTurniting ||
      this.evaluandoComite ||
      this.asignandoComite ||
      this.mostrarModalConfirmacionMover ||
      this.mostrarModalConfirmacionAsignacion ||
      this.mostrarModalExitoAsignacion ||
      !!this.archivoObservacion ||
      !!this.archivoTurniting ||
      !!this.archivoComite ||
      this.asuntoObservacion.trim().length > 0 ||
      this.comentarioObservacion.trim().length > 0 ||
      this.observacionTurniting.trim().length > 0 ||
      this.observacionComite.trim().length > 0
    );
  }

  registrarEvaluacionTurniting(): void {
    if (!this.articulo || !this.puedeMostrarTurniting || this.evaluandoTurniting) {
      return;
    }

    if (this.porcentajeTurniting === null || this.porcentajeTurniting === undefined) {
      this.accionError = 'Debes indicar el porcentaje de Turniting.';
      this.accionExitosa = null;
      return;
    }

    if (this.porcentajeTurniting < 0 || this.porcentajeTurniting > 100) {
      this.accionError = 'El porcentaje debe estar entre 0 y 100.';
      this.accionExitosa = null;
      return;
    }

    this.evaluandoTurniting = true;
    this.accionError = null;
    this.accionExitosa = null;

    this.articulosService
      .evaluarTurniting(this.articulo.id, {
        porcentaje: this.porcentajeTurniting,
        observacion: this.observacionTurniting.trim() || undefined,
        archivo: this.archivoTurniting,
      })
      .subscribe({
        next: (respuesta) => {
          this.evaluandoTurniting = false;
          this.porcentajeTurniting = null;
          this.observacionTurniting = '';
          this.archivoTurniting = null;
          this.nombreArchivoTurniting = '';
          this.accionExitosa = respuesta.message;
          this.cargarArticulo(this.articulo!.id);
        },
        error: (err) => {
          this.evaluandoTurniting = false;
          this.accionError = err?.error?.message ?? 'No se pudo registrar la evaluación de Turniting.';
        },
      });
  }
}
