import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
  pdf_completo?: string | null;
  portada?: string | null;
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
  pdf_completo?: string | null;
  numeroArticulos: number;
  articulos: Array<{
    id: number;
    codigo: string;
    titulo: string;
    resumen: string;
    autores: Array<{ id: number; nombre: string; correo: string }>;
  }>;
  temas: string[];
  palabrasClave: string;
  doi: string | null;
  issn: string | null;
  paginas: string | null;
  fechaPublicacion: string | null;
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

  getEdiciones(): Observable<GetEdicionesResponse> {
    return this.http.get<GetEdicionesResponse>(`${environment.apiUrlBackend}/ediciones`);
  }

  createEdicionConPortada(formData: FormData): Observable<CreateEdicionRevistaResponse> {
    return this.http.post<CreateEdicionRevistaResponse>(
      `${environment.apiUrlBackend}/ediciones`,
      formData,
    );
  }

  createEdicion(payload: CreateEdicionRevistaPayload): Observable<CreateEdicionRevistaResponse> {
    return this.http.post<CreateEdicionRevistaResponse>(
      `${environment.apiUrlBackend}/ediciones`,
      payload,
    );
  }

  deleteEdicion(id: number): Observable<DeleteEdicionRevistaResponse> {
    return this.http.delete<DeleteEdicionRevistaResponse>(
      `${environment.apiUrlBackend}/ediciones/${id}/with-message`,
    );
  }

  updateEdicion(
    id: number,
    payload: UpdateEdicionRevistaPayload,
  ): Observable<UpdateEdicionRevistaResponse> {
    return this.http.put<UpdateEdicionRevistaResponse>(
      `${environment.apiUrlBackend}/ediciones/${id}`,
      payload,
    );
  }

  getConteoArticulos(id: number): Observable<GetConteoArticulosResponse> {
    return this.http.get<GetConteoArticulosResponse>(
      `${environment.apiUrlBackend}/ediciones/${id}/conteo-articulos`,
    );
  }

  getEdicionesPublicadas(): Observable<{ message: string; data: EdicionPublicadaBackend[] }> {
    return this.http.get<{ message: string; data: EdicionPublicadaBackend[] }>(
      `${environment.apiUrlBackend}/ediciones/publicadas`,
    );
  }

  publicarEdicion(
    payload: PublicarEdicionRevistaPayload,
  ): Observable<PublicarEdicionRevistaResponse> {
    return this.http.post<PublicarEdicionRevistaResponse>(
      `${environment.apiUrlBackend}/ediciones/publicar`,
      payload,
    );
  }

  unpublishEdicion(id: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${environment.apiUrlBackend}/ediciones/${id}/unpublish`,
      {},
    );
  }

  updateEdicionConPortada(
    id: number,
    formData: FormData,
  ): Observable<UpdateEdicionRevistaResponse> {
    return this.http.put<UpdateEdicionRevistaResponse>(
      `${environment.apiUrlBackend}/ediciones/${id}`,
      formData,
    );
  }

  deletePortada(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${environment.apiUrlBackend}/ediciones/${id}/portada`,
    );
  }

  publicarEdicionRapida(formData: FormData): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrlBackend}/ediciones/publicacion-rapida`,
      formData,
    );
  }
}
