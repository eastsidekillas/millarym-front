import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';

/** Эти запросы не повторяем после обновления токена. */
const NO_RETRY = ['/users/login/', '/users/logout/', '/token/refresh/'];

/**
 * Cookie отправляются на тот же адрес автоматически; withCredentials — на случай,
 * если фронт и API окажутся на разных портах. На 401 один раз обновляем
 * токен и повторяем запрос; не вышло — на страницу входа.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const request = req.clone({ withCredentials: true });

  return next(request).pipe(
    catchError((error: unknown) => {
      const is401 = error instanceof HttpErrorResponse && error.status === 401;
      if (!is401 || NO_RETRY.some((p) => req.url.includes(p))) {
        return throwError(() => error);
      }
      return auth.refreshToken().pipe(
        switchMap(() => next(request)),
        catchError((refreshError: unknown) => {
          // /me при открытии страницы без входа — guard сам отправит на вход
          if (!req.url.includes('/users/me/')) auth.dropSession();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
