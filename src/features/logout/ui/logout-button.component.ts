import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { SessionApi, SessionStore } from '@entities/session';

/** Кнопка «Выйти»: завершить сессию на сервере и открыть страницу входа. */
@Component({
  selector: 'app-logout-button',
  template: `<button type="button" class="btn-ghost" (click)="logout()">Выйти</button>`,
})
export class LogoutButtonComponent {
  private readonly api = inject(SessionApi);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  logout(): void {
    this.api
      .logout()
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.session.clear();
        this.router.navigate(['/login']);
      });
  }
}
