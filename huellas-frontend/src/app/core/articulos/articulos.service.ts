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
  etapaActual: {
    id: number;
    nombre: string;
  };
  autores: Array<{
    id: number;
    nombre: string;
    email: string;
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
        this.http.get(`${environment.apiUrlBackend}/articulos/descargar/${filename}`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          responseType: 'blob', // Importante para manejar el archivo binario
        }),
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
