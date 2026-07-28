import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RevisorDto {
	id: number;
	nombre: string | null;
	correo: string | null;
	perfil: string;
	cargaActual: number;
}

export interface RelevanciaResponse {
	id: number;
	relevancia: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface AsignacionRevisorResponse {
	message: string;
	articuloId: number;
	revisorId: number;
}

export interface RevocarRevisorResponse {
	message: string;
	articuloId: number;
}

export interface ArticuloRevisorDto {
	id: number;
	codigo: string;
	titulo: string;
	resumen: string;
	tema: string;
	fechaAsignacion: string | null;
	fechaLimite: string | null;
	estado: 'pendiente' | 'en-proceso' | 'evaluado';
	prioridad: 'alta' | 'media' | 'baja';
	ronda: number;
	solicitudProrrogaRevisorPendiente?: boolean;
	prorrogaRevisorAceptada?: boolean;
	enlace?: string;
}

export interface NotificacionRevisorDto {
	id: string;
	articuloId?: number;
	codigoArticulo?: string;
	titulo: string;
	detalle: string;
	fecha: string;
	enlace?: string;
}

export interface RevisionRevisorPayload {
	recomendacion: 'aceptar' | 'ajustes' | 'rechazar';
	calificacion: number;
	comentarios?: string;
	archivo?: File | null;
}

export interface RevisionRevisorResponse {
	message: string;
	articuloId: number;
	observacionId: number;
	recomendacion: 'aceptar' | 'ajustes' | 'rechazar';
	calificacion: number;
}

export interface HistorialRevisionRevisorDto {
	id: number;
	articuloId: number;
	codigoArticulo: string;
	tituloArticulo: string;
	decision: 'aceptar' | 'ajustes' | 'rechazar';
	fechaEnvio: string;
	observacion: string;
	tieneAdjunto: boolean;
	archivoNombre?: string | null;
	enlace?: string;
}

export interface PerfilRevisorResponse {
	nombre: string;
	telefono: string;
	perfilAcademico: string;
	institucion: string;
}

export interface PerfilRevisorUpdatePayload {
	nombre: string;
	telefono: string;
	perfilAcademico: string;
	institucion: string;
}

@Injectable({
	providedIn: 'root',
})
export class RevisoresService {
	private baseUrl = environment.apiUrlBackend;
	private http = inject(HttpClient);

	getRevisores(): Observable<RevisorDto[]> {
		return this.http.get<RevisorDto[]>(`${this.baseUrl}/revisores`);
	}

	generarPuntaje(articuloId: number): Observable<RelevanciaResponse[]> {
		return this.http.post<RelevanciaResponse[]>(
			`${this.baseUrl}/revisores/generar-puntaje`,
			{ articuloId },
		);
	}

	asignarRevisor(
		articuloId: number,
		revisorId: number,
	): Observable<AsignacionRevisorResponse> {
		return this.http.post<AsignacionRevisorResponse>(
			`${this.baseUrl}/articulos/${articuloId}/asignar-revisor`,
			{ revisorId },
		);
	}

	revocarRevisor(articuloId: number): Observable<RevocarRevisorResponse> {
		return this.http.delete<RevocarRevisorResponse>(
			`${this.baseUrl}/articulos/${articuloId}/asignar-revisor`,
		);
	}

	getPerfilRevisor(): Observable<PerfilRevisorResponse> {
		return this.http.get<PerfilRevisorResponse>(`${this.baseUrl}/usuarios/perfil`);
	}

	getArticulosAsignadosRevisor(): Observable<ArticuloRevisorDto[]> {
		return this.http.get<ArticuloRevisorDto[]>(`${this.baseUrl}/revisores/mis-articulos`);
	}

	getNotificacionesRevisor(): Observable<NotificacionRevisorDto[]> {
		return this.http.get<NotificacionRevisorDto[]>(`${this.baseUrl}/revisores/mis-notificaciones`);
	}

	enviarRevisionRevisor(
		articuloId: number,
		payload: RevisionRevisorPayload,
	): Observable<RevisionRevisorResponse> {
		if (payload.archivo) {
			return this.http.post<RevisionRevisorResponse>(
				`${this.baseUrl}/revisores/mis-articulos/${articuloId}/revision`,
				this.buildRevisionFormData(payload),
			);
		} else {
			return this.http.post<RevisionRevisorResponse>(
				`${this.baseUrl}/revisores/mis-articulos/${articuloId}/revision`,
				{
					recomendacion: payload.recomendacion,
					calificacion: payload.calificacion,
					comentarios: payload.comentarios,
				},
			);
		}
	}

	getHistorialRevisionRevisor(): Observable<HistorialRevisionRevisorDto[]> {
		return this.http.get<HistorialRevisionRevisorDto[]>(`${this.baseUrl}/revisores/mis-revisiones`);
	}

	solicitarProrrogaRevisor(articuloId: number, comentarios?: string): Observable<any> {
		return this.http.post<any>(
			`${this.baseUrl}/articulos/${articuloId}/revisor/prorroga`,
			{ comentarios: comentarios?.trim() || undefined },
		);
	}

	private buildRevisionFormData(payload: RevisionRevisorPayload): FormData {
		const formData = new FormData();
		formData.append('recomendacion', payload.recomendacion);
		formData.append('calificacion', String(payload.calificacion));
		if (payload.comentarios) {
			formData.append('comentarios', payload.comentarios);
		}
		if (payload.archivo) {
			formData.append('archivo', payload.archivo);
		}
		return formData;
	}

	updatePerfilRevisor(
		payload: PerfilRevisorUpdatePayload,
	): Observable<PerfilRevisorResponse> {
		return this.http.put<PerfilRevisorResponse>(
			`${this.baseUrl}/usuarios/perfil`,
			payload,
		);
	}
}
