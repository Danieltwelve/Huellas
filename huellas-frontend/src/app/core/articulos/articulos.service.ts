import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
  estado_articulo?: string;
  archivado?: boolean;
  edicionId?: number | null;
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
  contextoRequerimiento: 'autor' | 'comite-editorial' | 'editorial' | 'revisor';
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
  usuariosPorProfesion: Array<{ profesion: string; cantidad: number }>;
  usuariosPorNivelPosgrado: Array<{ nivel: string; cantidad: number }>;
  estudiantesPosgrado: Array<{ nivel: string; cantidad: number }>;
  statsRolesYUsuarios: Array<{
    usuarioId: number;
    nombre: string;
    rol: string;
    asignados: number;
    evaluados: number;
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

  getArticuloFlujo(id: number): Observable<ArticuloFlujo> {
    return this.http.get<ArticuloFlujo>(`${environment.apiUrlBackend}/articulos/flujo/${id}`);
  }

  agregarObservacion(
    articuloId: number,
    payload: { asunto: string; comentarios?: string; etapaId?: number; archivo?: File | null },
  ): Observable<{ message: string; observacionId: number }> {
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

    return this.http.post<{ message: string; observacionId: number }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/observaciones`,
      formData,
    );
  }

  moverEtapa(
    articuloId: number,
    etapaId: number,
  ): Observable<{ message: string; etapaActual: { id: number; nombre: string } }> {
    return this.http.patch<{ message: string; etapaActual: { id: number; nombre: string } }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/etapa`,
      { etapaId },
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

    return this.http.post<{
      message: string;
      evaluacion: {
        porcentaje: number;
        resultado: 'descartado' | 'correccion-requerida';
        observacionId: number;
      };
      etapaActual: { id: number; nombre: string };
    }>(`${environment.apiUrlBackend}/articulos/${articuloId}/turnitin/evaluacion`, formData);
  }

  resolverProrrogaCorreccion(
    articuloId: number,
    decision: 'aceptar' | 'rechazar',
    comentarios?: string,
  ): Observable<{ message: string; fechaVencimientoCorreccion?: string | null }> {
    return this.http.patch<{ message: string; fechaVencimientoCorreccion?: string | null }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/correccion/prorroga`,
      { decision, comentarios: comentarios?.trim() || undefined },
    );
  }

  solicitarProrrogaComite(articuloId: number, comentarios?: string): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/comite/prorroga`,
      { comentarios: comentarios?.trim() || undefined },
    );
  }

  resolverProrrogaComite(
    articuloId: number,
    decision: 'aceptar' | 'rechazar',
    comentarios?: string,
  ): Observable<any> {
    return this.http.patch<any>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/comite/prorroga`,
      { decision, comentarios: comentarios?.trim() || undefined },
    );
  }

  resolverProrrogaRevisor(
    articuloId: number,
    decision: 'aceptar' | 'rechazar',
    comentarios?: string,
  ): Observable<any> {
    return this.http.patch<any>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/revisor/prorroga`,
      { decision, comentarios: comentarios?.trim() || undefined },
    );
  }

  getResumenArticulos(archivados?: boolean): Observable<ArticuloResumenBackend[]> {
    const query = archivados !== undefined ? `?archivados=${archivados}` : '';
    return this.http.get<ArticuloResumenBackend[]>(`${environment.apiUrlBackend}/articulos/resumen${query}`);
  }

  getNotificacionesEditorial(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrlBackend}/articulos/editoriales/notificaciones`);
  }

  getArticulosEnPublicacion(): Observable<ArticuloPublicacionBackend[]> {
    return this.http.get<ArticuloPublicacionBackend[]>(
      `${environment.apiUrlBackend}/articulos/publicacion/candidatos`,
    );
  }

  getAutoresCertificados(): Observable<UsuarioCertificadosBackend[]> {
    return this.http.get<UsuarioCertificadosBackend[]>(
      `${environment.apiUrlBackend}/usuarios/autores`,
    );
  }

  getComiteEditorialCertificados(): Observable<UsuarioCertificadosBackend[]> {
    return this.http.get<UsuarioCertificadosBackend[]>(
      `${environment.apiUrlBackend}/usuarios/comite-editorial`,
    );
  }

  getRevisoresCertificados(): Observable<UsuarioCertificadosBackend[]> {
    return this.http.get<UsuarioCertificadosBackend[]>(
      `${environment.apiUrlBackend}/usuarios/revisores`,
    );
  }

  getArticulosComiteAsignados(): Observable<ArticuloResumenBackend[]> {
    return this.http.get<ArticuloResumenBackend[]>(
      `${environment.apiUrlBackend}/articulos/comite/asignados`,
    );
  }

  getArticulosComiteAsignadosPaged(opts?: { page?: number; limit?: number }): Observable<any> {
    const query = opts ? `?page=${opts.page ?? 1}&limit=${opts.limit ?? 25}` : '';
    return this.http.get(`${environment.apiUrlBackend}/articulos/comite/asignados${query}`);
  }

  getHistorialEvaluacionesComite(opts?: { page?: number; limit?: number }): Observable<any> {
    const query = opts ? `?page=${opts.page ?? 1}&limit=${opts.limit ?? 25}` : '';
    return this.http.get(`${environment.apiUrlBackend}/articulos/comite/mis-evaluaciones${query}`);
  }

  getEstadisticasComite(): Observable<ComiteEstadisticas> {
    return this.http.get<ComiteEstadisticas>(
      `${environment.apiUrlBackend}/articulos/comite/estadisticas`,
    );
  }

  getNotificacionesVencimientoComite(): Observable<ComiteNotificacionVencimiento[]> {
    return this.http.get<ComiteNotificacionVencimiento[]>(
      `${environment.apiUrlBackend}/articulos/comite/notificaciones-vencimiento`,
    );
  }

  getReporteComite(tipo?: 'historial' | 'asignados'): Observable<any[]> {
    const query = tipo ? `?tipo=${tipo}` : '';
    return this.http.get<any[]>(`${environment.apiUrlBackend}/articulos/comite/reporte${query}`);
  }

  descargarReporteComiteExcel(): Observable<Blob> {
    return this.http.get(`${environment.apiUrlBackend}/articulos/comite/reporte/excel`, {
      responseType: 'blob',
    });
  }

  descargarReporteComitePdf(): Observable<Blob> {
    return this.http.get(`${environment.apiUrlBackend}/articulos/comite/reporte/pdf`, {
      responseType: 'blob',
    });
  }

  getMisArticulos(): Observable<ArticuloResumenBackend[]> {
    return this.http.get<ArticuloResumenBackend[]>(
      `${environment.apiUrlBackend}/articulos/mis-articulos`,
    );
  }

  descargarArchivo(filename: string): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrlBackend}/articulos/descargar/${encodeURIComponent(filename)}`,
      {
        responseType: 'blob',
      },
    );
  }

  aceptarCorreccionAutor(
    articuloId: number,
    observacionId: number,
    comentarios?: string,
  ): Observable<{ message: string; observacionId?: number }> {
    return this.http.post<{ message: string; observacionId?: number }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/correcciones/${observacionId}/aceptar`,
      { comentarios: comentarios?.trim() || undefined },
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
    const formData = new FormData();
    formData.append('decision', payload.decision);

    if (payload.observacion) {
      formData.append('observacion', payload.observacion);
    }

    if (payload.archivo) {
      formData.append('archivo', payload.archivo, payload.archivo.name);
    }

    return this.http.post<{ message: string; etapaActual: { id: number; nombre: string } }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/comite/evaluacion`,
      formData,
    );
  }

  asignarComiteEditorial(
    articuloId: number,
    comiteEditorialId: number,
  ): Observable<{
    message: string;
    comiteEditorial: { id: number; nombre: string; correo: string };
  }> {
    return this.http.post<{
      message: string;
      comiteEditorial: { id: number; nombre: string; correo: string };
    }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/asignar-comite`,
      { comiteEditorialId },
    );
  }

  crearArticulo(formData: FormData): Observable<any> {
    return this.http.post<any>(`${environment.apiUrlBackend}/articulos/envio`, formData);
  }

  getEstadoEnviosArticulos(): Observable<EstadoEnviosArticulos> {
    return this.http.get<EstadoEnviosArticulos>(
      `${environment.apiUrlBackend}/articulos/configuracion/envios`,
    );
  }

  getTemasCatalogo(): Observable<TemaCatalogoBackend[]> {
    return this.http.get<TemaCatalogoBackend[]>(`${environment.apiUrlBackend}/temas`);
  }

  actualizarEstadoEnviosArticulos(habilitado: boolean): Observable<EstadoEnviosArticulos> {
    return this.http.patch<EstadoEnviosArticulos>(
      `${environment.apiUrlBackend}/articulos/configuracion/envios`,
      { habilitado },
    );
  }

  getEstadisticasGeneralesArticulos(): Observable<EstadisticasGeneralesArticulosBackend> {
    return this.http.get<EstadisticasGeneralesArticulosBackend>(
      `${environment.apiUrlBackend}/articulos/estadisticas`,
    );
  }

  listarCertificados(): Observable<CertificadoArticuloBackend[]> {
    return this.http.get<CertificadoArticuloBackend[]>(
      `${environment.apiUrlBackend}/articulos/certificados`,
    );
  }

  subirCertificado(
    articuloId: number,
    payload: {
      tipo: 'evaluacion' | 'publicacion' | 'aceptacion' | 'envio' | 'revision' | 'otro';
      titulo?: string;
      contextoRequerimiento: 'autor' | 'comite-editorial' | 'editorial' | 'revisor';
      etapaReferencia?: string;
      archivo: File;
    },
  ): Observable<{ message: string; certificadoId: number }> {
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

    return this.http.post<{ message: string; certificadoId: number }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/certificados`,
      formData,
    );
  }

  descargarCertificado(certificadoId: number): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrlBackend}/articulos/certificados/${certificadoId}/descargar`,
      {
        responseType: 'blob',
      },
    );
  }

  actualizarCertificado(
    certificadoId: number,
    payload: {
      tipo?: 'evaluacion' | 'publicacion' | 'aceptacion' | 'envio' | 'revision' | 'otro';
      titulo?: string;
      contextoRequerimiento?: 'autor' | 'comite-editorial' | 'editorial' | 'revisor';
      etapaReferencia?: string;
    },
  ): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${environment.apiUrlBackend}/articulos/certificados/${certificadoId}`,
      payload,
    );
  }

  eliminarCertificado(certificadoId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${environment.apiUrlBackend}/articulos/certificados/${certificadoId}`,
    );
  }

  guardarChecklistRevisionFinal(
    articuloId: number,
    checklist: Record<string, boolean>,
  ): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/revision-final-checklist`,
      { checklist },
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
    return this.http.patch<{ message: string }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/publicar-metadata`,
      payload,
    );
  }

  getAutoresDeArticulo(articuloId: number): Observable<{ id: number; nombre: string }[]> {
    return this.http.get<{ id: number; nombre: string }[]>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/autores`,
    );
  }

  agregarAutorArticulo(articuloId: number, autorId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/autores`,
      { autorId },
    );
  }

  removerAutorArticulo(articuloId: number, autorId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/autores/${autorId}`,
    );
  }

  eliminarArticulo(articuloId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}`,
    );
  }

  archivarArticulo(articuloId: number, archivado: boolean): Observable<{ message: string; archivado: boolean }> {
    return this.http.patch<{ message: string; archivado: boolean }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/archivar`,
      { archivado }
    );
  }
}
