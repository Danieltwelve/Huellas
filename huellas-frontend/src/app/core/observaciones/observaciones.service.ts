import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface UltimaVersionAutorResponse {
  observacionId: number;
  asunto: string;
  comentarios: string | null;
  fechaSubida: string; // ISO date
  archivo: {
    nombreOriginal: string;
    path: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ObservacionesService {
  private apiUrl = `${environment.apiUrlBackend}/observaciones`;

  constructor(private http: HttpClient) {}

  getUltimaVersionAutor(articuloId: number): Observable<UltimaVersionAutorResponse> {
    return this.http.get<UltimaVersionAutorResponse>(
      `${this.apiUrl}/articulo/${articuloId}/ultima-version`,
    );
  }
}
