import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface ArchivoObservacionPayload {
	archivo_path: string;
	archivo_nombre_original: string;
}

export interface CrearObservacionAdminPayload {
	articulo_id: number;
	usuario_id?: number;
	etapa_id?: number;
	fecha_subida?: string;
	asunto?: string;
	comentarios?: string;
	archivos?: ArchivoObservacionPayload[];
}

export interface CrearObservacionResponse {
	message: string;
	observacionId: number;
	archivosRegistrados: number;
}

@Injectable({ providedIn: 'root' })
export class ObservacionesAdminService {
	private http = inject(HttpClient);
	private auth = inject(Auth);

	crearObservacion(
		payload: CrearObservacionAdminPayload,
		archivos?: File[],
	): Observable<CrearObservacionResponse> {
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(() => new Error('No hay sesion activa para crear la observacion.'));
		}

		const formData = new FormData();
		formData.append('articulo_id', String(payload.articulo_id));

		if (typeof payload.usuario_id === 'number') {
			formData.append('usuario_id', String(payload.usuario_id));
		}

		if (typeof payload.etapa_id === 'number') {
			formData.append('etapa_id', String(payload.etapa_id));
		}

		if (payload.fecha_subida) {
			formData.append('fecha_subida', payload.fecha_subida);
		}

		if (payload.asunto?.trim()) {
			formData.append('asunto', payload.asunto.trim());
		}

		if (payload.comentarios?.trim()) {
			formData.append('comentarios', payload.comentarios.trim());
		}

		if (archivos?.length) {
			for (const archivo of archivos) {
				formData.append('archivos', archivo, archivo.name);
			}
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				this.http.post<CrearObservacionResponse>(
					`${environment.apiUrlBackend}/observaciones/envio`,
					formData,
					{
						headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
					},
				),
			),
		);
	}
}
