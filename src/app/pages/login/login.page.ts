import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { errorText } from '@core/http-error';

/** Экран входа (spec 08 §2.0): «Логин или почта» + «Пароль». */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Куда вернуться после входа (?returnUrl=...) */
  readonly returnUrl = input<string>();

  readonly form = this.fb.group({
    login: ['', Validators.required],
    password: ['', Validators.required],
  });
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Введите логин и пароль.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { login, password } = this.form.getRawValue();
    this.auth.login({ login: login.trim(), password }).subscribe({
      next: () => {
        const target = this.returnUrl();
        // Только внутренние адреса приложения
        const safe = target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
        this.router.navigateByUrl(safe);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(errorText(err, 'Не удалось войти.'));
        this.form.controls.password.reset();
      },
    });
  }
}
