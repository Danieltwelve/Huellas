import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface CreateEdicionRevistaPayload {
  titulo: string;
  volumen: number;
  numero: number;
  anio: number;
}

export interface EstadoEdicionBackend {
  id: number;
  estado: string;
}

export interface EdicionRevistaBackend {
  id: number;
  titulo: string;
  volumen: number;
  numero: number;
  anio: number;
  fecha_estado: string;
  estado_id: EstadoEdicionBackend;
}

export interface EdicionPublicadaBackend {
  estado: any;
  id: number;
  titulo: string;
  volumen: number;
  numero: number;
  anio: number;
  fecha_estado: string;
  portada?: string | null;
  numeroArticulos: number;
  articulos: Array<{
    id: number;
    codigo: string;
    titulo: string;
    resumen: string;
    autores: Array<{ id: number; nombre: string; correo: string }>;
  }>;
}

export interface PublicarEdicionRevistaPayload {
  edicionId: number;
  articuloIds: number[];
}

export interface UpdateEdicionRevistaPayload {
  titulo: string;
  volumen: number;
  numero: number;
  anio: number;
  estado_id?: number;
}

interface CreateEdicionRevistaResponse {
  message: string;
  data: unknown;
}

interface GetEdicionesResponse {
  message: string;
  data: EdicionRevistaBackend[];
}

interface DeleteEdicionRevistaResponse {
  message: string;
}

interface UpdateEdicionRevistaResponse {
  message: string;
  data: unknown;
}

interface PublicarEdicionRevistaResponse {
  message: string;
  data: {
    id: number;
    titulo: string;
    volumen: number;
    numero: number;
    anio: number;
    fecha_estado: string;
    numeroArticulos: number;
    articuloIds: number[];
  };
}

interface GetConteoArticulosResponse {
  message: string;
  data: {
    edicion_id: number;
    numero_articulos: number;
  };
}

@Injectable({ providedIn: 'root' })
export class EdicionesRevistaService {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  getEdiciones(): Observable<GetEdicionesResponse> {
    const currentUser = this.auth.currentUser;

    if (currentUser) {
      return from(currentUser.getIdToken()).pipe(
        switchMap((token) =>
          this.http.get<GetEdicionesResponse>(`${environment.apiUrlBackend}/ediciones`, {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          }),
        ),
      );
    } else {
      return this.http.get<GetEdicionesResponse>(`${environment.apiUrlBackend}/ediciones`);
    }
  }

  createEdicionConPortada(formData: FormData): Observable<CreateEdicionRevistaResponse> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para crear una edición.'));
    }
    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<CreateEdicionRevistaResponse>(
          `${environment.apiUrlBackend}/ediciones`,
          formData,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  createEdicion(payload: CreateEdicionRevistaPayload): Observable<CreateEdicionRevistaResponse> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para crear una edición.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<CreateEdicionRevistaResponse>(
          `${environment.apiUrlBackend}/ediciones`,
          payload,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  deleteEdicion(id: number): Observable<DeleteEdicionRevistaResponse> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para eliminar una edición.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.delete<DeleteEdicionRevistaResponse>(
          `${environment.apiUrlBackend}/ediciones/${id}/with-message`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  updateEdicion(
    id: number,
    payload: UpdateEdicionRevistaPayload,
  ): Observable<UpdateEdicionRevistaResponse> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para editar una edición.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.put<UpdateEdicionRevistaResponse>(
          `${environment.apiUrlBackend}/ediciones/${id}`,
          payload,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  getConteoArticulos(id: number): Observable<GetConteoArticulosResponse> {
    const currentUser = this.auth.currentUser;

    if (currentUser) {
      return from(currentUser.getIdToken()).pipe(
        switchMap((token) =>
          this.http.get<GetConteoArticulosResponse>(
            `${environment.apiUrlBackend}/ediciones/${id}/conteo-articulos`,
            {
              headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
            },
          ),
        ),
      );
    } else {
      return this.http.get<GetConteoArticulosResponse>(
        `${environment.apiUrlBackend}/ediciones/${id}/conteo-articulos`,
      );
    }
  }

  getEdicionesPublicadas(): Observable<{ message: string; data: EdicionPublicadaBackend[] }> {
    return this.http.get<{ message: string; data: EdicionPublicadaBackend[] }>(
      `${environment.apiUrlBackend}/ediciones/publicadas`,
    );
  }

  publicarEdicion(
    payload: PublicarEdicionRevistaPayload,
  ): Observable<PublicarEdicionRevistaResponse> {
    const currentUser = this.auth.currentUser;

    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para publicar una edición.'));
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<PublicarEdicionRevistaResponse>(
          `${environment.apiUrlBackend}/ediciones/publicar`,
          payload,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  unpublishEdicion(id: number): Observable<{ message: string }> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para despublicar una edición.'));
    }
    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.patch<{ message: string }>(
          `${environment.apiUrlBackend}/ediciones/${id}/unpublish`,
          {}, // body vacío
          { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
        ),
      ),
    );
  }

  updateEdicionConPortada(
    id: number,
    formData: FormData,
  ): Observable<UpdateEdicionRevistaResponse> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para editar la edición.'));
    }
    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.put<UpdateEdicionRevistaResponse>(
          `${environment.apiUrlBackend}/ediciones/${id}`,
          formData,
          { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
        ),
      ),
    );
  }

  deletePortada(id: number): Observable<{ message: string }> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return throwError(() => new Error('No hay sesión activa para eliminar la portada.'));
    }
    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.delete<{ message: string }>(
          `${environment.apiUrlBackend}/ediciones/${id}/portada`,
          { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
        ),
      ),
    );
  }
}
