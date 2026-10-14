import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { SessionApi } from '../api/session.api';
import { Me, RightCode } from './session.types';

/**
 * Текущий сотрудник и его права (signals).
 * Токены лежат в httpOnly cookie — фронт их не видит и не хранит.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(SessionApi);

  private readonly _me = signal<Me | null>(null);
  readonly me = this._me.asReadonly();
  readonly isLoggedIn = computed(() => this._me() !== null);
  private readonly rights = computed(() => new Set(this._me()?.rights ?? []));

  private meRequest$: Observable<boolean> | null = null;
  private refresh$: Observable<void> | null = null;

  can(code: RightCode): boolean {
    return this.rights().has(code);
  }

  setMe(me: Me): void {
    this._me.set(me);
  }

  clear(): void {
    this._me.set(null);
  }

  /** Есть ли вход. Один запрос /me на все одновременные проверки. */
  checkAuth(): Observable<boolean> {
    if (this._me()) return of(true);
    if (!this.meRequest$) {
      this.meRequest$ = this.api.me().pipe(
        tap((me) => this._me.set(me)),
        map(() => true),
        catchError(() => of(false)),
        finalize(() => (this.meRequest$ = null)),
        shareReplay(1),
      );
    }
    return this.meRequest$;
  }

  /** Обновить access-токен. Параллельные 401 ждут один и тот же запрос. */
  refreshToken(): Observable<void> {
    if (!this.refresh$) {
      this.refresh$ = this.api.refresh().pipe(
        finalize(() => (this.refresh$ = null)),
        shareReplay(1),
      );
    }
    return this.refresh$;
  }
}
