import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface UsuarioBackend {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  correo_verificado: boolean;
  estado_cuenta: boolean;
  roles: { id: number; rol: string }[];
  articulosAsignados?: number;
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

export interface PerfilUsuarioResponse {
  id: number;
  nombre: string;
  telefono: string;
  correo: string;
}

export interface PerfilUsuarioUpdatePayload {
  nombre: string;
  telefono: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);

  getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Observable<UsersPageResponse> {
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
    );
  }

  getCommitteeMembers(): Observable<UsuarioBackend[]> {
    return this.http.get<UsuarioBackend[]>(`${environment.apiUrlBackend}/usuarios/comite-editorial`);
  }

  createAdmin(payload: AdminCreateUserPayload): Observable<UsuarioBackend> {
    return this.http.post<UsuarioBackend>(`${environment.apiUrlBackend}/usuarios`, payload);
  }

  getRoles(): Observable<RolBackend[]> {
    return this.http.get<RolBackend[]>(`${environment.apiUrlBackend}/usuarios/roles`);
  }

  updateUser(id: number, payload: Partial<UsuarioBackend>): Observable<UsuarioBackend> {
    return this.http.put<UsuarioBackend>(`${environment.apiUrlBackend}/usuarios/${id}`, payload);
  }

  resendVerificationEmail(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrlBackend}/usuarios/${id}/reenviar-verificacion`,
      {},
    );
  }

  restoreAccess(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrlBackend}/usuarios/${id}/restablecer-acceso`,
      {},
    );
  }

  deleteUser(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrlBackend}/usuarios/${id}`);
  }

  getPerfilUsuario(): Observable<PerfilUsuarioResponse> {
    return this.http.get<PerfilUsuarioResponse>(`${environment.apiUrlBackend}/usuarios/perfil`);
  }

  updatePerfilUsuario(payload: PerfilUsuarioUpdatePayload): Observable<PerfilUsuarioResponse> {
    return this.http.put<PerfilUsuarioResponse>(
      `${environment.apiUrlBackend}/usuarios/perfil`,
      payload,
    );
  }

  getAutoresLista(): Observable<{ id: number; nombre: string }[]> {
    return this.http.get<{ id: number; nombre: string }[]>(
      `${environment.apiUrlBackend}/usuarios/autores-lista`,
    );
  }
}
