import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { SessionApi, SessionStore } from '@entities/session';

@Injectable({ providedIn: 'root' })
export class Logout {
  private readonly api = inject(SessionApi);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  run(): void {
    this.api
      .logout()
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.session.clear();
        this.router.navigate(['/login']);
      });
  }
}
