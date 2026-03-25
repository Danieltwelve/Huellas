import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { from, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environments';
import { Auth } from '@angular/fire/auth';

export interface RequisitoRevista {
  id: number;
  requisito: string;
}

@Injectable({
  providedIn: 'root'
})
export class RequisitosRevistaService {
  private auth = inject(Auth);

  constructor(private http: HttpClient) {}

  findAll(): Observable<RequisitoRevista[]> {
    const currentUser = this.auth.currentUser;
    if (currentUser){
      return from(currentUser.getIdToken()).pipe(
        switchMap((token) =>
          this.http.get<RequisitoRevista[]>(`${environment.apiUrlBackend}/requisitos-revista`, {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          }),
        ),
      );
    } else {
      return this.http.get<RequisitoRevista[]>(`${environment.apiUrlBackend}/requisitos-revista`);
    }
  }

  create(requisito: string): Observable<RequisitoRevista> {
    const currentUser = this.auth.currentUser;
    if(!currentUser) {
      throw new Error('No hay sesión activa para crear un requisito.');
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.post<RequisitoRevista>(
          `${environment.apiUrlBackend}/requisitos-revista`,
          { requisito },
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );

  }

  delete(id: number): Observable<void> {
    const currentUser = this.auth.currentUser;
    if(!currentUser) {
      throw new Error('No hay sesión activa para eliminar un requisito.');
    }

    return from(currentUser.getIdToken()).pipe(
      switchMap((token) =>
        this.http.delete<void>(
          `${environment.apiUrlBackend}/requisitos-revista/${id}`,
          {
            headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
          },
        ),
      ),
    );
  }
}
