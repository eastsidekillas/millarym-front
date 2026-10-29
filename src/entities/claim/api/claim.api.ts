import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom, shareReplay } from 'rxjs';
import { Page } from '@shared/api';
import { environment } from '@shared/config';
import { filenameFrom, saveBlob } from '@shared/lib';
import { Claim, ClaimChoices, ClaimFields, ClaimFile, ClaimListItem, ClaimPhoto, ClaimQuery, ClaimState, ClaimStats } from '../model/claim.types';

function toParams(query: ClaimQuery): HttpParams {
  let p = new HttpParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') p = p.set(key, String(value));
  return p;
}

@Injectable({ providedIn: 'root' })
export class ClaimApi {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.baseURL}/claims`;
  private choices$?: Observable<ClaimChoices>;

  list(query: ClaimQuery): Observable<Page<ClaimListItem>> {
    return this.http.get<Page<ClaimListItem>>(`${this.api}/`, { params: toParams(query) });
  }

  stats(query: ClaimQuery): Observable<ClaimStats> {
    return this.http.get<ClaimStats>(`${this.api}/stats/`, { params: toParams(query) });
  }

  choices(): Observable<ClaimChoices> {
    this.choices$ ??= this.http.get<ClaimChoices>(`${this.api}/choices/`).pipe(shareReplay(1));
    return this.choices$;
  }

  get(id: number): Observable<Claim> {
    return this.http.get<Claim>(`${this.api}/${id}/`);
  }

  create(body: Partial<ClaimFields>): Observable<Claim> {
    return this.http.post<Claim>(`${this.api}/`, body);
  }

  update(id: number, body: Partial<ClaimFields>): Observable<Claim> {
    return this.http.patch<Claim>(`${this.api}/${id}/`, body);
  }

  close(id: number, state: Exclude<ClaimState, 'open'>, note: string): Observable<Claim> {
    return this.http.post<Claim>(`${this.api}/${id}/close/`, { state, note });
  }

  reopen(id: number): Observable<Claim> {
    return this.http.post<Claim>(`${this.api}/${id}/reopen/`, {});
  }

  addPhoto(id: number, file: File): Observable<ClaimPhoto> {
    const body = new FormData();
    body.append('photo', file);
    return this.http.post<ClaimPhoto>(`${this.api}/${id}/photos/`, body);
  }

  addFile(id: number, file: File): Observable<ClaimFile> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post<ClaimFile>(`${this.api}/${id}/files/`, body);
  }

  deleteFile(id: number, fileId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}/files/${fileId}/`);
  }

  deletePhoto(id: number, photoId: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}/photos/${photoId}/`);
  }

  pdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/${id}/pdf/`, { responseType: 'blob' });
  }

  async downloadBlank(): Promise<void> {
    const response = await firstValueFrom(this.http.get(`${this.api}/blank/`, { observe: 'response', responseType: 'blob' }));
    saveBlob(response.body!, filenameFrom(response, 'Акт-претензия, бланк для клиента.xls'));
  }
}
