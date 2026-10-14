import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '@shared/config';
import { filenameFrom, saveBlob } from '@shared/lib';
import { ModelCount, ReportInfo, ReportResult } from '../model/report.types';

export type ReportParams = Record<string, string>;

function toParams(params: ReportParams): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(params)) if (v) p = p.set(k, v);
  return p;
}

@Injectable({ providedIn: 'root' })
export class ReportApi {
  private readonly http = inject(HttpClient);
  private readonly api = environment.baseURL;

  list(): Observable<ReportInfo[]> {
    return this.http.get<ReportInfo[]>(`${this.api}/reports/`);
  }

  run(kind: string, params: ReportParams): Observable<ReportResult> {
    return this.http.get<ReportResult>(`${this.api}/reports/${kind}/`, { params: toParams(params) });
  }

  freeStockModels(): Observable<ModelCount[]> {
    return this.http.get<ModelCount[]>(`${this.api}/reports/free-stock/models/`);
  }

  async download(kind: string, params: ReportParams): Promise<void> {
    await this.save(`${this.api}/reports/${kind}/xlsx/`, toParams(params), `${kind}.xlsx`);
  }

  async downloadItem(id: number, number: string): Promise<void> {
    await this.save(`${this.api}/items/${id}/export/`, new HttpParams(), `Изделие ${number.replace('/', '-')}.xlsx`);
  }

  private async save(url: string, params: HttpParams, fallback: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get(url, { params, observe: 'response', responseType: 'blob' }));
      saveBlob(response.body!, filenameFrom(response, fallback));
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.error instanceof Blob) {
        let body: unknown = null;
        try {
          body = JSON.parse(await err.error.text());
        } catch {
          body = null;
        }
        throw new HttpErrorResponse({ error: body, status: err.status, statusText: err.statusText, url: err.url ?? undefined });
      }
      throw err;
    }
  }
}
