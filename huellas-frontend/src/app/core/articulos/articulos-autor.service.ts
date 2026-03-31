import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { from, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface ArticuloAutor {
  id: number;
  codigo: string;
  titulo: string;
  etapa_nombre: string;
  fecha_inicio: string | null;
  correccion_pendiente: boolean;
}

export interface NotificacionAutorBackend {
  id: string;
  articuloId: number;
  codigoArticulo: string;
  tituloArticulo: string;
  titulo: string;
  detalle: string;
  tipo: 'accion' | 'informacion' | 'exito';
  fecha: string;
  origen: 'etapa' | 'observacion';
}

@Injectable({ providedIn: 'root' })
export class ArticulosAutorService {
  private http = inject(HttpClient);
  private auth = inject(Auth);

  getMisArticulos(): Observable<ArticuloAutor[]> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<ArticuloAutor[]>(
          `${environment.apiUrlBackend}/articulos/mis-articulos`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  crearEnvio(formData: FormData): Observable<any> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post(
          `${environment.apiUrlBackend}/articulos/envio`,
          formData,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  getMisNotificaciones(): Observable<NotificacionAutorBackend[]> {
    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        this.http.get<NotificacionAutorBackend[]>(
          `${environment.apiUrlBackend}/articulos/mis-notificaciones`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }

  enviarCorreccion(
    articuloId: number,
    archivo: File,
    comentarios?: string,
  ): Observable<{ message: string; observacionId: number }> {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);

    if (comentarios && comentarios.trim().length > 0) {
      formData.append('comentarios', comentarios.trim());
    }

    return from(this.auth.currentUser!.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<{ message: string; observacionId: number }>(
          `${environment.apiUrlBackend}/articulos/${articuloId}/correccion`,
          formData,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }
}
