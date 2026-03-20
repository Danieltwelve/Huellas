import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface ArticuloResumenBackend {
	id: number;
	codigo: string;
	titulo: string;
	etapa_nombre: string;
	fecha_inicio: string | null;
}

@Injectable({ providedIn: 'root' })
export class ArticulosService {
	private http = inject(HttpClient);
	private auth = inject(Auth);

	getResumenArticulos(): Observable<ArticuloResumenBackend[]> {
		const currentUser = this.auth.currentUser;

		if (!currentUser) {
			return throwError(() => new Error('No hay sesion activa para consultar articulos.'));
		}

		return from(currentUser.getIdToken()).pipe(
			switchMap((token) =>
				this.http.get<ArticuloResumenBackend[]>(
					`${environment.apiUrlBackend}/articulos/resumen`,
					{
						headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
					},
				),
			),
		);
	}
}
