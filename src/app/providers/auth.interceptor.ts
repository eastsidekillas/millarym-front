import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { SessionApi, SessionStore } from '@entities/session';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const request = req.clone({ withCredentials: true });

  return next(request).pipe(
    catchError((error: unknown) => {
      const is401 = error instanceof HttpErrorResponse && error.status === 401;
      if (!is401 || SessionApi.noRetryUrls.some((p) => req.url.includes(p))) {
        return throwError(() => error);
      }
      return session.refreshToken().pipe(
        switchMap(() => next(request)),
        catchError((refreshError: unknown) => {
          // 401 на /me при открытии без входа обрабатывает guard
          if (!req.url.includes(SessionApi.meUrl)) {
            session.clear();
            const url = router.url;
            const returnUrl = url && !url.startsWith('/login') ? url : undefined;
            router.navigate(['/login'], { queryParams: returnUrl ? { returnUrl } : {} });
          }
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
