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
					`${this.baseUrl}/revisores/perfil`,
					{ headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
				),
			),
		);
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
					`${this.baseUrl}/revisores/perfil`,
					payload,
					{ headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) },
				),
			),
		);
	}
}

