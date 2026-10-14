import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '@env/environment';
import { LoginRequest, Me, PasswordChangeRequest, RightCode } from './auth.models';

/**
 * Текущий пользователь и его права.
 * Токены лежат в httpOnly cookie — фронт их не видит и не хранит.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = environment.baseURL;

  private readonly _me = signal<Me | null>(null);
  readonly me = this._me.asReadonly();
  readonly isLoggedIn = computed(() => this._me() !== null);
  private readonly rightsSet = computed(() => new Set(this._me()?.rights ?? []));

  private meRequest$: Observable<boolean> | null = null;
  private refresh$: Observable<void> | null = null;

  can(code: RightCode): boolean {
    return this.rightsSet().has(code);
  }

  /** Есть ли вход. Один запрос /me на все одновременные проверки. */
  checkAuth(): Observable<boolean> {
    if (this._me()) return of(true);
    if (!this.meRequest$) {
      this.meRequest$ = this.http.get<Me>(`${this.api}/users/me/`).pipe(
        tap((me) => this._me.set(me)),
        map(() => true),
        catchError(() => of(false)),
        finalize(() => (this.meRequest$ = null)),
        shareReplay(1),
      );
    }
    return this.meRequest$;
  }

  login(body: LoginRequest): Observable<Me> {
    return this.http.post<Me>(`${this.api}/users/login/`, body).pipe(tap((me) => this._me.set(me)));
  }

  /** Обновить access-токен. Параллельные 401 ждут один и тот же запрос. */
  refreshToken(): Observable<void> {
    if (!this.refresh$) {
      this.refresh$ = this.http.post<void>(`${this.api}/token/refresh/`, {}).pipe(
        finalize(() => (this.refresh$ = null)),
        shareReplay(1),
      );
    }
    return this.refresh$;
  }

  logout(): void {
    this.http
      .post(`${this.api}/users/logout/`, {})
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this._me.set(null);
        this.router.navigate(['/login']);
      });
  }

  /** Сессия истекла: забыть пользователя и показать вход, потом вернуть на ту же страницу. */
  dropSession(): void {
    this._me.set(null);
    const url = this.router.url;
    const returnUrl = url && !url.startsWith('/login') ? url : undefined;
    this.router.navigate(['/login'], { queryParams: returnUrl ? { returnUrl } : {} });
  }

  changePassword(body: PasswordChangeRequest): Observable<void> {
    return this.http.post<void>(`${this.api}/users/password/`, body);
  }
}
