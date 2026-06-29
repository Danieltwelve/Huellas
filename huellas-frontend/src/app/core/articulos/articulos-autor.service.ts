import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { CorrectionState } from './correction-notification.util';

export interface ArticuloAutor {
  id: number;
  codigo: string;
  titulo: string;
  etapa_nombre: string;
  fecha_inicio: string | null;
  correccion_pendiente: boolean;
  correccion_vencida?: boolean;
  fecha_vencimiento_correccion?: string | null;
  solicitud_prorroga_correccion_pendiente?: boolean;
  evaluado_pares?: boolean;
  evaluado_comite?: boolean;
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
  estadoCorreccion?: CorrectionState;
  fechaVencimientoCorreccion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ArticulosAutorService {
  private http = inject(HttpClient);

  getMisArticulos(): Observable<ArticuloAutor[]> {
    return this.http.get<ArticuloAutor[]>(
      `${environment.apiUrlBackend}/articulos/mis-articulos`,
    );
  }

  crearEnvio(formData: FormData): Observable<any> {
    return this.http.post(
      `${environment.apiUrlBackend}/articulos/envio`,
      formData,
      { reportProgress: true, observe: 'events' }
    );
  }

  getMisNotificaciones(): Observable<NotificacionAutorBackend[]> {
    return this.http.get<NotificacionAutorBackend[]>(
      `${environment.apiUrlBackend}/articulos/mis-notificaciones`,
    );
  }

  enviarCorreccion(
    articuloId: number,
    archivo: File,
    comentarios?: string,
  ): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);

    if (comentarios && comentarios.trim().length > 0) {
      formData.append('comentarios', comentarios.trim());
    }

    return this.http.post(
      `${environment.apiUrlBackend}/articulos/${articuloId}/correccion`,
      formData,
      { reportProgress: true, observe: 'events' }
    );
  }

  solicitarProrrogaCorreccion(
    articuloId: number,
    comentarios?: string,
  ): Observable<{ message: string; observacionId: number }> {
    return this.http.post<{ message: string; observacionId: number }>(
      `${environment.apiUrlBackend}/articulos/${articuloId}/correccion/prorroga`,
      { comentarios: comentarios?.trim() || undefined },
    );
  }
}
