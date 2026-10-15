import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { LoginFormComponent } from '@features/auth-by-login';

@Component({
  selector: 'app-login-page',
  imports: [LoginFormComponent],
  template: `
    <div class="flex min-h-full items-center justify-center px-4 py-10">
      <div class="w-full max-w-sm">
        <div class="mb-6 flex items-center gap-3">
          <img src="milarum-logo.svg" alt="Миларум" class="h-10 w-auto rounded bg-white p-px" />
          <div>
            <h1 class="text-lg font-semibold leading-6">Резервы и Заказы</h1>
            <p class="text-sm text-muted">Вход для сотрудников</p>
          </div>
        </div>

        <app-login-form (loggedIn)="goBack()" />

        <p class="mt-4 text-sm text-muted">Забыли пароль? Новый выдаст директор или администратор.</p>
      </div>
    </div>
  `,
})
export class LoginPage {
  private readonly router = inject(Router);

  readonly returnUrl = input<string>();

  goBack(): void {
    const target = this.returnUrl();
    // Только внутренние адреса приложения
    const safe = target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
    this.router.navigateByUrl(safe);
  }
}
