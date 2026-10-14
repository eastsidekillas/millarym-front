import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';

/** Без входа приложение недоступно (spec 08 §2.0). */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .checkAuth()
    .pipe(
      map((ok) => ok || router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } })),
    );
};

/** Уже вошёл — со страницы входа сразу в приложение. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.checkAuth().pipe(map((ok) => (ok ? router.createUrlTree(['/']) : true)));
};
