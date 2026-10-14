import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { Page } from '@shared/api';
import { environment } from '@shared/config';
import { Fabric, KitOption, ProductModel, Team } from '../model/catalog.types';

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
}
