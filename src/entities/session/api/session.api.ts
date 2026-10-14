import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@shared/config';
import { LoginRequest, Me, PasswordChangeRequest } from '../model/session.types';

@Injectable({ providedIn: 'root' })
export class SessionApi {
  private readonly http = inject(HttpClient);
  private readonly api = environment.baseURL;

  static readonly noRetryUrls = ['/users/login/', '/users/logout/', '/token/refresh/'];
  static readonly meUrl = '/users/me/';

  login(body: LoginRequest): Observable<Me> {
    return this.http.post<Me>(`${this.api}/users/login/`, body);
  }

  me(): Observable<Me> {
    return this.http.get<Me>(`${this.api}${SessionApi.meUrl}`);
  }

  refresh(): Observable<void> {
    return this.http.post<void>(`${this.api}/token/refresh/`, {});
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.api}/users/logout/`, {});
  }

  changePassword(body: PasswordChangeRequest): Observable<void> {
    return this.http.post<void>(`${this.api}/users/password/`, body);
  }
}
