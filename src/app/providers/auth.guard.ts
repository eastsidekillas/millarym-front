import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { SessionStore } from '@entities/session';

/** Без входа приложение недоступно (spec 08 §2.0). */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  return session
    .checkAuth()
    .pipe(
      map((ok) => ok || router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })),
    );
};

/** Уже вошёл — со страницы входа сразу в приложение. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  return session.checkAuth().pipe(map((ok) => (ok ? router.createUrlTree(['/']) : true)));
};
