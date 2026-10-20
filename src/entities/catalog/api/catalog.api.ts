import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay, tap } from 'rxjs';
import { Page } from '@shared/api';
import { environment } from '@shared/config';
import {
  Category,
  Deadlines,
  Fabric,
  FabricQuery,
  KitOption,
  ProductModel,
  SimpleRef,
  SimpleRefBody,
  SimpleRefKind,
  Team,
} from '../model/catalog.types';

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  private readonly api = environment.baseURL;

  private models$?: Observable<ProductModel[]>;
  private kit$?: Observable<KitOption[]>;

  models(): Observable<ProductModel[]> {
    this.models$ ??= this.http
      .get<ProductModel[]>(`${this.api}/models/`, { params: { active: 'true' } })
      .pipe(shareReplay(1));
    return this.models$;
  }

  kitOptions(): Observable<KitOption[]> {
    this.kit$ ??= this.http
      .get<KitOption[]>(`${this.api}/kit-options/`, { params: { active: 'true' } })
      .pipe(shareReplay(1));
    return this.kit$;
  }

  teams(): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.api}/teams/`, { params: { active: 'true' } });
  }

  fabrics(search: string, limit = 20): Observable<Fabric[]> {
    const params = { active: 'true', search, limit };
    return this.http.get<Page<Fabric>>(`${this.api}/fabrics/`, { params }).pipe(map((page) => page.results));
  }

  fabricPage(query: FabricQuery): Observable<Page<Fabric>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      params = params.set(key, String(value));
    }
    return this.http.get<Page<Fabric>>(`${this.api}/fabrics/`, { params });
  }

  createFabric(body: FormData): Observable<Fabric> {
    return this.http.post<Fabric>(`${this.api}/fabrics/`, body);
  }

  updateFabric(id: number, body: FormData | Partial<Pick<Fabric, 'name' | 'active'>> | { photo: null }): Observable<Fabric> {
    return this.http.patch<Fabric>(`${this.api}/fabrics/${id}/`, body);
  }

  deleteFabric(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/fabrics/${id}/`);
  }

  allModels(): Observable<ProductModel[]> {
    return this.http.get<ProductModel[]>(`${this.api}/models/`);
  }

  createModel(body: FormData): Observable<ProductModel> {
    return this.http.post<ProductModel>(`${this.api}/models/`, body).pipe(tap(() => this.forgetModels()));
  }

  updateModel(id: number, body: FormData | Partial<Pick<ProductModel, 'name' | 'category' | 'active' | 'kit_options'>> | { photo: null }): Observable<ProductModel> {
    return this.http.patch<ProductModel>(`${this.api}/models/${id}/`, body).pipe(tap(() => this.forgetModels()));
  }

  deleteModel(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/models/${id}/`).pipe(tap(() => this.forgetModels()));
  }

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.api}/categories/`);
  }

  simpleRefs<T extends SimpleRef>(kind: SimpleRefKind): Observable<T[]> {
    return this.http.get<T[]>(`${this.api}/${kind}/`);
  }

  saveSimpleRef<T extends SimpleRef>(kind: SimpleRefKind, id: number | null, body: SimpleRefBody): Observable<T> {
    const request = id
      ? this.http.patch<T>(`${this.api}/${kind}/${id}/`, body)
      : this.http.post<T>(`${this.api}/${kind}/`, body);
    return request.pipe(tap(() => kind === 'kit-options' && (this.kit$ = undefined)));
  }

  deleteSimpleRef(kind: SimpleRefKind, id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${kind}/${id}/`).pipe(tap(() => kind === 'kit-options' && (this.kit$ = undefined)));
  }

  deadlines(): Observable<Deadlines> {
    return this.http.get<Deadlines>(`${this.api}/deadlines/`);
  }

  updateDeadlines(body: Partial<Deadlines>): Observable<Deadlines> {
    return this.http.patch<Deadlines>(`${this.api}/deadlines/`, body);
  }

  private forgetModels() {
    this.models$ = undefined;
  }
}
