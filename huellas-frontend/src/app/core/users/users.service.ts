import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { from, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface UsuarioBackend {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  correo_verificado: boolean;
  estado_cuenta: boolean;
  roles: { id: number; rol: string }[];
}

export interface AdminCreateUserPayload {
  nombre: string;
  correo: string;
  contraseña: string;
  telefono?: string;
  rolId: number;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  getAll(): Observable<UsuarioBackend[]> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<UsuarioBackend[]>(
          `${environment.apiUrlBackend}/usuarios`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  createAdmin(payload: AdminCreateUserPayload): Observable<UsuarioBackend> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<UsuarioBackend>(
          `${environment.apiUrlBackend}/usuarios`,
          payload,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  updateUser(id: number, payload: Partial<UsuarioBackend>): Observable<UsuarioBackend> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        this.http.put<UsuarioBackend>(
          `${environment.apiUrlBackend}/usuarios/${id}`,
          payload,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }
}
