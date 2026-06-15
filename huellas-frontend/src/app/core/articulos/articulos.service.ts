import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface ArticuloPublicable {
  id: number;
  codigo: string;
  titulo: string;
}

export interface ArticuloResumenBackend {
  id: number;
  codigo: string;
  titulo: string;
  etapa_nombre: string;
  fecha_inicio: string | null;
  estado_evaluacion?: 'pendiente' | 'evaluado-aceptado' | 'evaluado-rechazado';
  fecha_asignacion?: string | null;
  fecha_vencimiento?: string | null;
  esta_vencido?: boolean;
  dias_restantes?: number | null;
  solicitudProrrogaComitePendiente?: boolean;
  solicitudProrrogaCorreccionPendiente?: boolean;
  solicitudProrrogaRevisorPendiente?: boolean;
  prorrogaRevisorAceptada?: boolean;
}

export interface ArticuloPublicacionBackend extends ArticuloResumenBackend {}

export interface UsuarioCertificadosBackend {
  id: number;
  nombre: string;
  correo: string;
}

export interface ComiteEvaluacionHistorial {
  articuloId: number;
  codigo: string;
  titulo: string;
  decision: 'aceptado' | 'rechazado';
  fechaEvaluacion: string;
  diasEvaluacion: number | null;
  etapaActual: string;
}

export interface ComiteEstadisticas {
  totalAsignadas: number;
  totalPendientes: number;
  totalEvaluadas: number;
  totalAceptadas: number;
  totalRechazadas: number;
  tasaAprobacion: number;
  promedioDiasEvaluacion: number;
  tasaCumplimiento30Dias: number;
}

export interface ComiteNotificacionVencimiento {
  articuloId: number;
  codigo: string;
  titulo: string;
  tipo: 'vencido' | 'proximo-vencer';
  diasRestantes: number | null;
  mensaje: string;
}

export interface EstadoEnviosArticulos {
  habilitado: boolean;
}

export interface CertificadoArticuloBackend {
  id: number;
  articuloId: number;
  codigoArticulo: string;
  tituloArticulo: string;
  tipo: 'evaluacion' | 'publicacion' | 'aceptacion' | 'envio' | 'revision' | 'otro';
  titulo: string;
  contextoRequerimiento: 'autor' | 'comite-editorial' | 'editorial';
  etapaReferencia: string | null;
  archivoNombreOriginal: string;
  fechaSubida: string;
  fechaSubidaDate?: string | Date | null;
  subidoPor: string;
}

export interface TemaCatalogoBackend {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface EstadisticasGeneralesArticulosBackend {
  totalArticulos: number;
  promedioAutores: number;
  promedioTemas: number;
  promedioDiasDesdeEnvio: number;
  articulosEnPublicacion: number;
  articulosEnProceso: number;
  etapaDistribucion: Array<{ etapa: string; cantidad: number }>;
  temaDistribucion: Array<{ tema: string; cantidad: number }>;
  mensualDistribucion: Array<{ mes: string; cantidad: number }>;
  articulosRecientes: Array<{
    codigo: string;
    titulo: string;
    etapa: string;
    fechaEnvio: string | null;
    autores: number;
    observaciones: number;
  }>;
}

export interface ArticuloFlujo {
  id: number;
  codigo: string;
  titulo: string;
  doi?: string | null;
  issn?: string | null;
  edicionId?: number | null;
  paginas?: string | null;
  revisionFinalChecklist?: string | null;
  evaluacionComiteRealizada?: boolean;
  fechaAsignacionComite?: string | null;
  fechaVencimientoComite?: string | null;
  fechaVencimientoCorreccion?: string | null;
  solicitudProrrogaCorreccionPendiente?: boolean;
  solicitudProrrogaComitePendiente?: boolean;
  solicitudProrrogaRevisorPendiente?: boolean;
  prorrogaRevisorAceptada?: boolean;
  resumen: string;
  palabrasClave: string[];
  temas: string[];
  fechaEnvio: string | null;
  etapaActual: {
    id: number;
    nombre: string;
  };
  autores: Array<{
    id: number;
    nombre: string;
    email: string;
  }>;
  comiteEditorial: {
    id: number;
    nombre: string;
    email: string;
  } | null;
  revisor?: {
    id: number;
    usuarioId: number;
    nombre: string | null;
    correo: string | null;
    perfil: string;
    cargaActual: number;
  } | null;
  historialEtapas: Array<{
    id: number;
    etapaId: number;
    etapaNombre: string;
    fechaInicio: string;
    fechaFin: string | null;
    usuarioId: number | null;
  }>;
  observaciones: ObservacionBackend[];
}

export interface ArchivoObservacionBackend {
  id: number;
  archivoPath: string;
  archivoNombreOriginal: string;
}

export interface ObservacionBackend {
  id: number;
  asunto: string;
  comentarios: string | null;
  fechaSubida: string;
  etapa: {
    id: number;
    nombre: string;
  } | null;
  usuario: {
    id: number;
    nombre: string;
    email: string;
    roles: Array<{
      id: number;
      nombre: string;
    }>;
  } | null;
  archivos: ArchivoObservacionBackend[];
}

@Injectable({ providedIn: 'root' })
export class ArticulosService {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  getArticuloFlujo(id: number): Observable<ArticuloFlujo> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para consultar el artículo.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<ArticuloFlujo>(`${environment.apiUrlBackend}/articulos/flujo/${id}`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }

  agregarObservacion(
    articuloId: number,
    payload: { asunto: string; comentarios?: string; etapaId?: number; archivo?: File | null },
  ): Observable<{ message: string; observacionId: number }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para crear observaciones.'));
    }

    const formData = new FormData();
    formData.append('asunto', payload.asunto);

    if (payload.comentarios) {
      formData.append('comentarios', payload.comentarios);
    }

    if (payload.etapaId) {
      formData.append('etapaId', String(payload.etapaId));
    }

    if (payload.archivo) {
      formData.append('archivo', payload.archivo, payload.archivo.name);
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<{ message: string; observacionId: number }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/observaciones`,
          formData,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  moverEtapa(
    articuloId: number,
    etapaId: number,
  ): Observable<{ message: string; etapaActual: { id: number; nombre: string } }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para mover el artículo.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.patch<{ message: string; etapaActual: { id: number; nombre: string } }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/etapa`,
          { etapaId },
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  evaluarTurnitin(
    articuloId: number,
    payload: {
      porcentaje: number;
      observacion?: string;
      archivo?: File | null;
      decision?: string;
    },
  ): Observable<{
    message: string;
    evaluacion: {
      porcentaje: number;
      resultado: 'descartado' | 'aceptado' | 'correccion-requerida';
      observacionId: number;
    };
    etapaActual: { id: number; nombre: string };
  }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para evaluar Turnitin.'));
    }

    const formData = new FormData();
    formData.append('porcentaje', String(payload.porcentaje));

    if (payload.observacion) {
      formData.append('observacion', payload.observacion);
    }

    if (payload.archivo) {
      formData.append('archivo', payload.archivo, payload.archivo.name);
    }

    if (payload.decision) {
      formData.append('decision', payload.decision);
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<{
          message: string;
          evaluacion: {
            porcentaje: number;
            resultado: 'descartado' | 'correccion-requerida';
            observacionId: number;
          };
          etapaActual: { id: number; nombre: string };
        }>(`${environment.apiUrlBackend}/articulos/${articuloId}/turnitin/evaluacion`, formData, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }

  resolverProrrogaCorreccion(
    articuloId: number,
    decision: 'aceptar' | 'rechazar',
    comentarios?: string,
  ): Observable<{ message: string; fechaVencimientoCorreccion?: string | null }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para resolver la prórroga.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.patch<{ message: string; fechaVencimientoCorreccion?: string | null }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/correccion/prorroga`,
          { decision, comentarios: comentarios?.trim() || undefined },
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  solicitarProrrogaComite(articuloId: number, comentarios?: string): Observable<any> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para solicitar prórroga.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<any>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/comite/prorroga`,
          { comentarios: comentarios?.trim() || undefined },
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  resolverProrrogaComite(
    articuloId: number,
    decision: 'aceptar' | 'rechazar',
    comentarios?: string,
  ): Observable<any> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para resolver la prórroga.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.patch<any>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/comite/prorroga`,
          { decision, comentarios: comentarios?.trim() || undefined },
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  resolverProrrogaRevisor(
    articuloId: number,
    decision: 'aceptar' | 'rechazar',
    comentarios?: string,
  ): Observable<any> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para resolver la prórroga.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.patch<any>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/revisor/prorroga`,
          { decision, comentarios: comentarios?.trim() || undefined },
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  getResumenArticulos(): Observable<ArticuloResumenBackend[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para consultar artículos.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<ArticuloResumenBackend[]>(`${environment.apiUrlBackend}/articulos/resumen`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }

  getNotificacionesEditorial(): Observable<any[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(
        () => new Error('No hay sesión activa para consultar notificaciones editoriales.'),
      );
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<any[]>(`${environment.apiUrlBackend}/articulos/editoriales/notificaciones`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }

  getArticulosEnPublicacion(): Observable<ArticuloPublicacionBackend[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(
        () => new Error('No hay sesión activa para consultar artículos de publicación.'),
      );
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<ArticuloPublicacionBackend[]>(
          `${environment.apiUrlBackend}/articulos/publicacion/candidatos`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  getAutoresCertificados(): Observable<UsuarioCertificadosBackend[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para consultar autores.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<UsuarioCertificadosBackend[]>(
          `${environment.apiUrlBackend}/usuarios/autores`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  getComiteEditorialCertificados(): Observable<UsuarioCertificadosBackend[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para consultar comité editorial.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<UsuarioCertificadosBackend[]>(
          `${environment.apiUrlBackend}/usuarios/comite-editorial`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  getArticulosComiteAsignados(): Observable<ArticuloResumenBackend[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(
        () => new Error('No hay sesión activa para consultar artículos asignados.'),
      );
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<ArticuloResumenBackend[]>(
          `${environment.apiUrlBackend}/articulos/comite/asignados`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  getArticulosComiteAsignadosPaged(opts?: { page?: number; limit?: number }): Observable<any> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(
        () => new Error('No hay sesión activa para consultar artículos asignados.'),
      );
    }

    const query = opts ? `?page=${opts.page ?? 1}&limit=${opts.limit ?? 25}` : '';

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get(`${environment.apiUrlBackend}/articulos/comite/asignados${query}`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }

  getHistorialEvaluacionesComite(opts?: { page?: number; limit?: number }): Observable<any> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(
        () => new Error('No hay sesión activa para consultar historial de evaluaciones.'),
      );
    }

    const query = opts ? `?page=${opts.page ?? 1}&limit=${opts.limit ?? 25}` : '';

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get(`${environment.apiUrlBackend}/articulos/comite/mis-evaluaciones${query}`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }

  getEstadisticasComite(): Observable<ComiteEstadisticas> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para consultar estadísticas.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<ComiteEstadisticas>(
          `${environment.apiUrlBackend}/articulos/comite/estadisticas`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  getNotificacionesVencimientoComite(): Observable<ComiteNotificacionVencimiento[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para consultar notificaciones.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<ComiteNotificacionVencimiento[]>(
          `${environment.apiUrlBackend}/articulos/comite/notificaciones-vencimiento`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  getReporteComite(tipo?: 'historial' | 'asignados'): Observable<any[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para exportar reporte.'));
    }

    const query = tipo ? `?tipo=${tipo}` : '';
    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<any[]>(`${environment.apiUrlBackend}/articulos/comite/reporte${query}`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }

  descargarReporteComiteExcel(): Observable<Blob> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para exportar Excel.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get(`${environment.apiUrlBackend}/articulos/comite/reporte/excel`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          responseType: 'blob',
        }),
      ),
    );
  }

  descargarReporteComitePdf(): Observable<Blob> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para exportar PDF.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get(`${environment.apiUrlBackend}/articulos/comite/reporte/pdf`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          responseType: 'blob',
        }),
      ),
    );
  }

  getMisArticulos(): Observable<ArticuloResumenBackend[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para consultar artículos.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<ArticuloResumenBackend[]>(
          `${environment.apiUrlBackend}/articulos/mis-articulos`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  descargarArchivo(filename: string): Observable<Blob> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para descargar el archivo.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get(
          `${environment.apiUrlBackend}/articulos/descargar/${encodeURIComponent(filename)}`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
            responseType: 'blob', // Importante para manejar el archivo binario
          },
        ),
      ),
    );
  }

  aceptarCorreccionAutor(
    articuloId: number,
    observacionId: number,
    comentarios?: string,
  ): Observable<{ message: string; observacionId?: number }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para aceptar correcciones.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<{ message: string; observacionId?: number }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/correcciones/${observacionId}/aceptar`,
          { comentarios: comentarios?.trim() || undefined },
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  evaluarComite(
    articuloId: number,
    payload: {
      decision: 'aceptar' | 'rechazar';
      observacion?: string;
      archivo?: File | null;
    },
  ): Observable<{ message: string; etapaActual: { id: number; nombre: string } }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para evaluar el artículo.'));
    }

    const formData = new FormData();
    formData.append('decision', payload.decision);

    if (payload.observacion) {
      formData.append('observacion', payload.observacion);
    }

    if (payload.archivo) {
      formData.append('archivo', payload.archivo, payload.archivo.name);
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<{ message: string; etapaActual: { id: number; nombre: string } }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/comite/evaluacion`,
          formData,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  asignarComiteEditorial(
    articuloId: number,
    comiteEditorialId: number,
  ): Observable<{
    message: string;
    comiteEditorial: { id: number; nombre: string; correo: string };
  }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para asignar comité editorial.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<{
          message: string;
          comiteEditorial: { id: number; nombre: string; correo: string };
        }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/asignar-comite`,
          { comiteEditorialId },
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  crearArticulo(formData: FormData): Observable<any> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para crear artículo.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<any>(`${environment.apiUrlBackend}/articulos/envio`, formData, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }

  getEstadoEnviosArticulos(): Observable<EstadoEnviosArticulos> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(
        () => new Error('No hay sesión activa para consultar la configuración de envíos.'),
      );
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<EstadoEnviosArticulos>(
          `${environment.apiUrlBackend}/articulos/configuracion/envios`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  getTemasCatalogo(): Observable<TemaCatalogoBackend[]> {
    return this.http.get<TemaCatalogoBackend[]>(`${environment.apiUrlBackend}/temas`);
  }

  actualizarEstadoEnviosArticulos(habilitado: boolean): Observable<EstadoEnviosArticulos> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(
        () => new Error('No hay sesión activa para actualizar la configuración de envíos.'),
      );
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.patch<EstadoEnviosArticulos>(
          `${environment.apiUrlBackend}/articulos/configuracion/envios`,
          { habilitado },
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  getEstadisticasGeneralesArticulos(): Observable<EstadisticasGeneralesArticulosBackend> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(
        () => new Error('No hay sesión activa para consultar estadísticas generales.'),
      );
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<EstadisticasGeneralesArticulosBackend>(
          `${environment.apiUrlBackend}/articulos/estadisticas`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  listarCertificados(): Observable<CertificadoArticuloBackend[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para consultar certificados.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<CertificadoArticuloBackend[]>(
          `${environment.apiUrlBackend}/articulos/certificados`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  subirCertificado(
    articuloId: number,
    payload: {
      tipo: 'evaluacion' | 'publicacion' | 'aceptacion' | 'envio' | 'revision' | 'otro';
      titulo?: string;
      contextoRequerimiento: 'autor' | 'comite-editorial' | 'editorial';
      etapaReferencia?: string;
      archivo: File;
    },
  ): Observable<{ message: string; certificadoId: number }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para subir certificados.'));
    }

    const formData = new FormData();
    formData.append('tipo', payload.tipo);
    if (payload.titulo?.trim()) {
      formData.append('titulo', payload.titulo.trim());
    }
    formData.append('contextoRequerimiento', payload.contextoRequerimiento);
    if (payload.etapaReferencia?.trim()) {
      formData.append('etapaReferencia', payload.etapaReferencia.trim());
    }
    formData.append('archivo', payload.archivo, payload.archivo.name);

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<{ message: string; certificadoId: number }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/certificados`,
          formData,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  descargarCertificado(certificadoId: number): Observable<Blob> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para descargar certificados.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get(
          `${environment.apiUrlBackend}/articulos/certificados/${certificadoId}/descargar`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
            responseType: 'blob',
          },
        ),
      ),
    );
  }

  actualizarCertificado(
    certificadoId: number,
    payload: {
      tipo?: 'evaluacion' | 'publicacion' | 'aceptacion' | 'envio' | 'revision' | 'otro';
      titulo?: string;
      contextoRequerimiento?: 'autor' | 'comite-editorial' | 'editorial';
      etapaReferencia?: string;
    },
  ): Observable<{ message: string }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para editar certificados.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.patch<{ message: string }>(
          `${environment.apiUrlBackend}/articulos/certificados/${certificadoId}`,
          payload,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  eliminarCertificado(certificadoId: number): Observable<{ message: string }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para eliminar certificados.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.delete<{ message: string }>(
          `${environment.apiUrlBackend}/articulos/certificados/${certificadoId}`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  guardarChecklistRevisionFinal(
    articuloId: number,
    checklist: Record<string, boolean>,
  ): Observable<{ message: string }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.patch<{ message: string }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/revision-final-checklist`,
          { checklist },
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  guardarMetadataPublicacion(
    articuloId: number,
    payload: {
      edicionId: number;
      doi?: string;
      issn?: string;
      paginas?: string;
      publicar?: boolean;
    },
  ): Observable<{ message: string }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.patch<{ message: string }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/publicar-metadata`,
          payload,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  getAutoresDeArticulo(articuloId: number): Observable<{ id: number; nombre: string }[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<{ id: number; nombre: string }[]>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/autores`,
          { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
        ),
      ),
    );
  }

  agregarAutorArticulo(articuloId: number, autorId: number): Observable<{ message: string }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<{ message: string }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/autores`,
          { autorId },
          { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
        ),
      ),
    );
  }

  removerAutorArticulo(articuloId: number, autorId: number): Observable<{ message: string }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.delete<{ message: string }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/autores/${autorId}`,
          { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
        ),
      ),
    );
  }

  eliminarArticulo(articuloId: number): Observable<{ message: string }> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa.'));
    }
    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.delete<{ message: string }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}`,
          { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
        ),
      ),
    );
  }
}
