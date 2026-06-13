import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environments';

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
	private auth = inject(Auth);

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
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(
				() => new Error('No hay sesión activa para asignar el revisor.'),
			);
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				this.http.post<AsignacionRevisorResponse>(
					`${this.baseUrl}/articulos/${articuloId}/asignar-revisor`,
					{ revisorId },
					{ headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
				),
			),
		);
	}

	revocarRevisor(articuloId: number): Observable<RevocarRevisorResponse> {
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(
				() => new Error('No hay sesión activa para revocar el revisor.'),
			);
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				this.http.delete<RevocarRevisorResponse>(
					`${this.baseUrl}/articulos/${articuloId}/asignar-revisor`,
					{ headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
				),
			),
		);
	}

	getPerfilRevisor(): Observable<PerfilRevisorResponse> {
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(
				() => new Error('No hay sesión activa para obtener el perfil.'),
			);
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				this.http.get<PerfilRevisorResponse>(
					`${this.baseUrl}/usuarios/perfil`,
					{ headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
				),
			),
		);
	}

	getArticulosAsignadosRevisor(): Observable<ArticuloRevisorDto[]> {
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(
				() => new Error('No hay sesión activa para obtener los artículos asignados.'),
			);
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				this.http.get<ArticuloRevisorDto[]>(
					`${this.baseUrl}/revisores/mis-articulos`,
					{ headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
				),
			),
		);
	}

	getNotificacionesRevisor(): Observable<NotificacionRevisorDto[]> {
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(
				() => new Error('No hay sesión activa para obtener notificaciones.'),
			);
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				this.http.get<NotificacionRevisorDto[]>(
					`${this.baseUrl}/revisores/mis-notificaciones`,
					{ headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
				),
			),
		);
	}

	enviarRevisionRevisor(
		articuloId: number,
		payload: RevisionRevisorPayload,
	): Observable<RevisionRevisorResponse> {
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(
				() => new Error('No hay sesión activa para enviar la revisión.'),
			);
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				payload.archivo
					? this.http.post<RevisionRevisorResponse>(
						`${this.baseUrl}/revisores/mis-articulos/${articuloId}/revision`,
						this.buildRevisionFormData(payload),
						{ headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
					)
					: this.http.post<RevisionRevisorResponse>(
						`${this.baseUrl}/revisores/mis-articulos/${articuloId}/revision`,
						{
							recomendacion: payload.recomendacion,
							calificacion: payload.calificacion,
							comentarios: payload.comentarios,
						},
						{ headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
					),
			),
		);
	}

		getHistorialRevisionRevisor(): Observable<HistorialRevisionRevisorDto[]> {
			const currentUser = this.auth.currentUser;

			if (!currentUser) {
				return throwError(
					() => new Error('No hay sesión activa para obtener el historial.'),
				);
			}

			return from(currentUser.getIdToken()).pipe(
				switchMap((token) =>
					this.http.get<HistorialRevisionRevisorDto[]>(
						`${this.baseUrl}/revisores/mis-revisiones`,
						{ headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
					),
				),
			);
		}

	solicitarProrrogaRevisor(articuloId: number, comentarios?: string): Observable<any> {
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(
				() => new Error('No hay sesión activa para solicitar la prórroga.'),
			);
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				this.http.post<any>(
					`${this.baseUrl}/articulos/${articuloId}/revisor/prorroga`,
					{ comentarios: comentarios?.trim() || undefined },
					{ headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
				),
			),
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
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(
				() => new Error('No hay sesión activa para actualizar el perfil.'),
			);
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				this.http.put<PerfilRevisorResponse>(
					`${this.baseUrl}/usuarios/perfil`,
					payload,
					{ headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
				),
			),
		);
	}
}

