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

export interface UsersPageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  activeUsers: number;
  pendingUsers: number;
  roleUsersCount: number;
}

export interface UsersPageResponse {
  items: UsuarioBackend[];
  meta: UsersPageMeta;
}

export interface AdminCreateUserPayload {
  nombre: string;
  correo: string;
  contraseña: string;
  telefono?: string;
  rolId: number;
}

export interface RolBackend {
  id: number;
  rol: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  getAll(params?: { page?: number; limit?: number; search?: string }): Observable<UsersPageResponse> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) => {
        const queryParts = new URLSearchParams();

        if (typeof params?.page === 'number') {
          queryParts.set('page', String(params.page));
        }

        if (typeof params?.limit === 'number') {
          queryParts.set('limit', String(params.limit));
        }

        if (params?.search) {
          queryParts.set('search', params.search);
        }

        const queryString = queryParts.toString();

        return this.http.get<UsersPageResponse>(
          `${environment.apiUrlBackend}/usuarios${queryString ? `?${queryString}` : ''}`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        );
      }),
    );
  }

  getCommitteeMembers(): Observable<UsuarioBackend[]> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<UsuarioBackend[]>(
          `${environment.apiUrlBackend}/usuarios/comite-editorial`,
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

  getRoles(): Observable<RolBackend[]> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<RolBackend[]>(
          `${environment.apiUrlBackend}/usuarios/roles`,
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

  resendVerificationEmail(id: number): Observable<{ message: string }> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<{ message: string }>(
          `${environment.apiUrlBackend}/usuarios/${id}/reenviar-verificacion`,
          {},
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  restoreAccess(id: number): Observable<{ message: string }> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<{ message: string }>(
          `${environment.apiUrlBackend}/usuarios/${id}/restablecer-acceso`,
          {},
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  deleteUser(id: number): Observable<{ message: string }> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        this.http.delete<{ message: string }>(
          `${environment.apiUrlBackend}/usuarios/${id}`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }
}
