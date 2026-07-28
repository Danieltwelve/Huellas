import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RequisitoRevista {
  id: number;
  requisito: string;
}

export interface RequisitosPageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RequisitosPageResponse {
  items: RequisitoRevista[];
  meta: RequisitosPageMeta;
}

@Injectable({
  providedIn: 'root'
})
export class RequisitosRevistaService {
  private http = inject(HttpClient);

  findAll(params?: { page?: number; limit?: number }): Observable<RequisitosPageResponse> {
    const queryParts = new URLSearchParams();

    if (typeof params?.page === 'number') {
      queryParts.set('page', String(params.page));
    }

    if (typeof params?.limit === 'number') {
      queryParts.set('limit', String(params.limit));
    }

    const queryString = queryParts.toString();

    return this.http.get<RequisitosPageResponse>(
      `${environment.apiUrlBackend}/requisitos-revista${queryString ? `?${queryString}` : ''}`
    );
  }

  create(requisito: string): Observable<RequisitoRevista> {
    return this.http.post<RequisitoRevista>(
      `${environment.apiUrlBackend}/requisitos-revista`,
      { requisito },
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrlBackend}/requisitos-revista/${id}`
    );
  }
}
