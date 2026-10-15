import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '@shared/api';
import { environment } from '@shared/config';
import {
  Counters,
  Item,
  ItemCreate,
  ItemDetail,
  ItemEvent,
  ItemListParams,
  ItemUpdate,
  Stage,
} from '../model/item.types';

export type SimpleAction = 'fabric-arrived' | 'sew' | 'cover-ready' | 'ship' | 'trash' | 'restore' | 'return-to-work' | 'copy';

@Injectable({ providedIn: 'root' })
export class ItemApi {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.baseURL}/items`;

  list(params: ItemListParams): Observable<Page<Item>> {
    let p = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === '' || value === false) continue;
      p = p.set(key, String(value === true ? 1 : value));
    }
    return this.http.get<Page<Item>>(`${this.api}/`, { params: p });
  }

  counters(): Observable<Counters> {
    return this.http.get<Counters>(`${this.api}/counters/`);
  }

  get(id: number): Observable<ItemDetail> {
    return this.http.get<ItemDetail>(`${this.api}/${id}/`);
  }

  create(body: ItemCreate): Observable<Item[]> {
    return this.http.post<Item[]>(`${this.api}/`, body);
  }

  update(id: number, body: ItemUpdate): Observable<ItemDetail> {
    return this.http.patch<ItemDetail>(`${this.api}/${id}/`, body);
  }

  move(id: number, to: Stage, team?: number | null): Observable<ItemDetail> {
    return this.http.post<ItemDetail>(`${this.api}/${id}/move/`, { to, team: team ?? null });
  }

  bulkMove(ids: number[], to: Stage, team?: number | null): Observable<Item[]> {
    return this.http.post<Item[]>(`${this.api}/bulk-move/`, { ids, to, team: team ?? null });
  }

  reserve(id: number, reserve: string): Observable<ItemDetail> {
    return this.http.post<ItemDetail>(`${this.api}/${id}/reserve/`, { reserve });
  }

  run(id: number, action: SimpleAction): Observable<ItemDetail> {
    return this.http.post<ItemDetail>(`${this.api}/${id}/${action}/`, {});
  }

  events(params: Record<string, string | number>): Observable<Page<ItemEvent>> {
    return this.http.get<Page<ItemEvent>>(`${environment.baseURL}/events/`, { params });
  }

  passports(ids: number[]): Observable<Blob> {
    return this.http.get(`${environment.baseURL}/passports/`, { params: { ids: ids.join(',') }, responseType: 'blob' });
  }
}
