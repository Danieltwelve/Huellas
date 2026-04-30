import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environments';

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
  evaluacionComiteRealizada?: boolean;
  fechaAsignacionComite?: string | null;
  fechaVencimientoComite?: string | null;
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
    },
  ): Observable<{
    message: string;
    evaluacion: { porcentaje: number; resultado: 'descartado' | 'correccion-requerida'; observacionId: number };
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

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<{
          message: string;
          evaluacion: { porcentaje: number; resultado: 'descartado' | 'correccion-requerida'; observacionId: number };
          etapaActual: { id: number; nombre: string };
        }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/turnitin/evaluacion`,
          formData,
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

  getArticulosComiteAsignados(): Observable<ArticuloResumenBackend[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para consultar artículos asignados.'));
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

  getHistorialEvaluacionesComite(): Observable<ComiteEvaluacionHistorial[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para consultar historial de evaluaciones.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<ComiteEvaluacionHistorial[]>(
          `${environment.apiUrlBackend}/articulos/comite/mis-evaluaciones`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
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
        this.http.get(`${environment.apiUrlBackend}/articulos/descargar/${encodeURIComponent(filename)}`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          responseType: 'blob', // Importante para manejar el archivo binario
        }),
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
  ): Observable<{ message: string; comiteEditorial: { id: number; nombre: string; correo: string } }> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para asignar comité editorial.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<{ message: string; comiteEditorial: { id: number; nombre: string; correo: string } }>(
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
      return throwError(() => new Error('No hay sesión activa para consultar la configuración de envíos.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<EstadoEnviosArticulos>(`${environment.apiUrlBackend}/articulos/configuracion/envios`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }

  actualizarEstadoEnviosArticulos(habilitado: boolean): Observable<EstadoEnviosArticulos> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para actualizar la configuración de envíos.'));
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
      return throwError(() => new Error('No hay sesión activa para consultar estadísticas generales.'));
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
}
