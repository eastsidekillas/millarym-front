import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { LoginFormComponent } from '@features/auth-by-login';

/** Страница входа: логотип + форма. После входа — туда, откуда пришли. */
@Component({
  selector: 'app-login-page',
  imports: [LoginFormComponent],
  template: `
    <div class="flex min-h-full items-center justify-center px-4 py-10">
      <div class="w-full max-w-sm">
        <div class="mb-6 flex flex-col items-center gap-3 text-center">
          <span class="rounded-2xl bg-white p-2 shadow-sm">
            <img src="milarum-logo.svg" alt="Миларум" class="h-16 w-auto" />
          </span>
          <div>
            <div class="text-lg font-bold tracking-tight">CRM фабрики</div>
            <div class="text-sm text-muted">Производство и склады</div>
          </div>
        </div>

        <app-login-form (loggedIn)="goBack()" />

        <p class="mt-4 text-center text-xs text-muted">
          Забыли пароль — обратитесь к директору или администратору.
        </p>
      </div>
    </div>
  `,
})
export class LoginPage {
  private readonly router = inject(Router);

  /** Куда вернуться после входа (?returnUrl=...) */
  readonly returnUrl = input<string>();

  goBack(): void {
    const target = this.returnUrl();
    // Только внутренние адреса приложения
    const safe = target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
    this.router.navigateByUrl(safe);
  }
}
