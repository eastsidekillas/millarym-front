import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { SessionStore } from '@entities/session';

export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  return session
    .checkAuth()
    .pipe(
      map((ok) => ok || router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })),
    );
};

export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);
  return session.checkAuth().pipe(map((ok) => (ok ? router.createUrlTree(['/']) : true)));
};
