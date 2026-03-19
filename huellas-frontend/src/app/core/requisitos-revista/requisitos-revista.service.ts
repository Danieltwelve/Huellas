import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface RequisitoRevista {
  id: number;
  requisito: string;
}

@Injectable({
  providedIn: 'root'
})
export class RequisitosRevistaService {
  private apiUrl = `${environment.apiUrlBackend}/requisitos-revista`;

  constructor(private http: HttpClient) {}

  findAll(): Observable<RequisitoRevista[]> {
    return this.http.get<RequisitoRevista[]>(this.apiUrl);
  }

  create(requisito: string): Observable<RequisitoRevista> {
    return this.http.post<RequisitoRevista>(this.apiUrl, { requisito });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
