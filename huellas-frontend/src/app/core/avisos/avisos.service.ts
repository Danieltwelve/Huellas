import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environments';
import { Auth } from '@angular/fire/auth';

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
  private auth = inject(Auth);

  constructor(private http: HttpClient) {}

  getAvisos(): Observable<Aviso[]> {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      return from(currentUser.getIdToken()).pipe(
        switchMap((token) =>
          this.http.get<Aviso[]>(`${environment.apiUrlBackend}/avisos`, {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          }),
        ),
      );
    } else {
      return this.http.get<Aviso[]>(`${environment.apiUrlBackend}/avisos`);
    }
  }

  getAviso(id: number): Observable<Aviso> {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      return from(currentUser.getIdToken()).pipe(
        switchMap((token) =>
          this.http.get<Aviso>(`${environment.apiUrlBackend}/avisos/${id}`, {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          }),
        ),
      );
    } else {
      return this.http.get<Aviso>(`${environment.apiUrlBackend}/avisos/${id}`);
    }
  }

  createAviso(aviso: CreateAvisoDto): Observable<Aviso> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('No hay sesión activa para crear un aviso.');
    }
    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<Aviso>(`${environment.apiUrlBackend}/avisos`, aviso, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }

  updateAviso(id: number, aviso: UpdateAvisoDto): Observable<Aviso> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('No hay sesión activa para actualizar un aviso.');
    }
    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.patch<Aviso>(`${environment.apiUrlBackend}/avisos/${id}`, aviso, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }

  deleteAviso(id: number): Observable<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      throw new Error('No hay sesión activa para eliminar un aviso.');
    }
    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.delete<void>(`${environment.apiUrlBackend}/avisos/${id}`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        }),
      ),
    );
  }
}
