import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page } from '@shared/api';
import { environment } from '@shared/config';
import {
  AmountUnit,
  Counters,
  Item,
  ItemCreate,
  ItemDetail,
  ItemEvent,
  FabricSlot,
  ItemListParams,
  ItemUpdate,
  Stage,
  StageFilter,
} from '../model/item.types';

/** «work» и «fg» — только для правки даты выдачи в работу и перевода на СГП. */
export type Mark = 'fabric_ordered' | 'fabric_arrived' | 'sew' | 'cover_ready' | 'work' | 'fg';
export type SimpleAction = 'fabric-ordered' | 'fabric-arrived' | 'sew' | 'cover-ready' | 'ship' | 'trash' | 'cancel' | 'restore' | 'return-to-work' | 'copy' | 'ack-changes';

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

  /** Сколько найденного на каждом этапе: { orders: 2, cut: 13, …, trash: 1 }. */
  searchStages(params: ItemListParams): Observable<Record<StageFilter, number>> {
    let p = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === '' || value === false || key === 'stage') continue;
      p = p.set(key, String(value === true ? 1 : value));
    }
    return this.http.get<Record<StageFilter, number>>(`${this.api}/search-stages/`, { params: p });
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

  move(id: number, to: Stage, team?: number | null, date?: string | null): Observable<ItemDetail> {
    return this.http.post<ItemDetail>(`${this.api}/${id}/move/`, { to, team: team ?? null, date: date ?? null });
  }

  bulkMove(ids: number[], to: Stage, team?: number | null, date?: string | null): Observable<Item[]> {
    return this.http.post<Item[]>(`${this.api}/bulk-move/`, { ids, to, team: team ?? null, date: date ?? null });
  }

  reserve(id: number, reserve: string): Observable<ItemDetail> {
    return this.http.post<ItemDetail>(`${this.api}/${id}/reserve/`, { reserve });
  }

  run(id: number, action: SimpleAction): Observable<ItemDetail> {
    return this.http.post<ItemDetail>(`${this.api}/${id}/${action}/`, {});
  }

  markDate(id: number, mark: Mark, date: string): Observable<ItemDetail> {
    return this.http.post<ItemDetail>(`${this.api}/${id}/mark-date/`, { mark, date });
  }

  /** Метраж (или штуки у компаньона) — в любой момент, без «Изменить»: его часто вписывает закройный цех. */
  fabricAmount(id: number, slot: FabricSlot, meters: string | null, unit: AmountUnit): Observable<ItemDetail> {
    return this.http.post<ItemDetail>(`${this.api}/${id}/fabric-amount/`, { slot, meters, unit });
  }

  unmark(id: number, mark: Mark): Observable<ItemDetail> {
    return this.http.post<ItemDetail>(`${this.api}/${id}/unmark/`, { mark });
  }

  events(params: Record<string, string | number>): Observable<Page<ItemEvent>> {
    return this.http.get<Page<ItemEvent>>(`${environment.baseURL}/events/`, { params });
  }

  passports(ids: number[]): Observable<Blob> {
    return this.http.get(`${environment.baseURL}/passports/`, { params: { ids: ids.join(',') }, responseType: 'blob' });
  }
}
