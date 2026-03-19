import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface CreateEdicionRevistaPayload {
	titulo: string;
	volumen: number;
	numero: number;
	anio: number;
	fecha_estado: string;
}

export interface EstadoEdicionBackend {
	id: number;
	estado: string;
}

export interface EdicionRevistaBackend {
	id: number;
	titulo: string;
	volumen: number;
	numero: number;
	anio: number;
	fecha_estado: string;
	estado_id: EstadoEdicionBackend;
}

export interface UpdateEdicionRevistaPayload {
	titulo: string;
	volumen: number;
	numero: number;
	anio: number;
	estado_id: number;
}

interface CreateEdicionRevistaResponse {
	message: string;
	data: unknown;
}

interface GetEdicionesResponse {
	message: string;
	data: EdicionRevistaBackend[];
}

interface DeleteEdicionRevistaResponse {
	message: string;
}

interface UpdateEdicionRevistaResponse {
	message: string;
	data: unknown;
}

@Injectable({ providedIn: 'root' })
export class EdicionesRevistaService {
	private http = inject(HttpClient);
	private auth = inject(Auth);

	getEdiciones(): Observable<GetEdicionesResponse> {
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(() => new Error('No hay sesion activa para consultar ediciones.'));
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				this.http.get<GetEdicionesResponse>(
					`${environment.apiUrlBackend}/ediciones`,
					{
						headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
					},
				),
			),
		);
	}

	createEdicion(payload: CreateEdicionRevistaPayload): Observable<CreateEdicionRevistaResponse> {
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(() => new Error('No hay sesion activa para crear una edicion.'));
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				this.http.post<CreateEdicionRevistaResponse>(
					`${environment.apiUrlBackend}/ediciones`,
					payload,
					{
						headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
					},
				),
			),
		);
	}

	deleteEdicion(id: number): Observable<DeleteEdicionRevistaResponse> {
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(() => new Error('No hay sesion activa para eliminar una edicion.'));
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				this.http.delete<DeleteEdicionRevistaResponse>(
					`${environment.apiUrlBackend}/ediciones/${id}/with-message`,
					{
						headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
					},
				),
			),
		);
	}

	updateEdicion(
		id: number,
		payload: UpdateEdicionRevistaPayload,
	): Observable<UpdateEdicionRevistaResponse> {
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(() => new Error('No hay sesion activa para editar una edicion.'));
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				this.http.put<UpdateEdicionRevistaResponse>(
					`${environment.apiUrlBackend}/ediciones/${id}`,
					payload,
					{
						headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
					},
				),
			),
		);
	}
}
