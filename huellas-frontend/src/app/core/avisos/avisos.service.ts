import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface Aviso {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  fecha: string;
}

export interface CreateAvisoDto {
  tipo: string;
  titulo: string;
  mensaje: string;
  fecha: string;
}

export interface UpdateAvisoDto {
  tipo?: string;
  titulo?: string;
  mensaje?: string;
  fecha?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AvisosService {
  private http = inject(HttpClient);

  getAvisos(): Observable<Aviso[]> {
    return this.http.get<Aviso[]>(`${environment.apiUrlBackend}/avisos`);
  }

  getAviso(id: number): Observable<Aviso> {
    return this.http.get<Aviso>(`${environment.apiUrlBackend}/avisos/${id}`);
  }

  createAviso(aviso: CreateAvisoDto): Observable<Aviso> {
    return this.http.post<Aviso>(`${environment.apiUrlBackend}/avisos`, aviso);
  }

  updateAviso(id: number, aviso: UpdateAvisoDto): Observable<Aviso> {
    return this.http.patch<Aviso>(`${environment.apiUrlBackend}/avisos/${id}`, aviso);
  }

  deleteAviso(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrlBackend}/avisos/${id}`);
  }
}
