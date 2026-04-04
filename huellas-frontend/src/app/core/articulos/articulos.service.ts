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
}

export interface ArticuloFlujo {
  id: number;
  codigo: string;
  titulo: string;
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

  getResumenArticulos(): Observable<ArticuloResumenBackend[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesion activa para consultar articulos.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<ArticuloResumenBackend[]>(`${environment.apiUrlBackend}/articulos/resumen`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }

  getMisArticulos(): Observable<ArticuloResumenBackend[]> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesion activa para consultar articulos.'));
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

  crearArticulo(formData: FormData): Observable<any> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesion activa para crear articulo.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<any>(`${environment.apiUrlBackend}/articulos/envio`, formData, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }
}
