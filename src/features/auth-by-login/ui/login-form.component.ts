import { Component, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Me, SessionApi, SessionStore } from '@entities/session';
import { errorText } from '@shared/api';

/** Форма входа (spec 08 §2.0): «Логин или почта» + «Пароль». */
@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule],
  templateUrl: './login-form.component.html',
})
export class LoginFormComponent {
  private readonly api = inject(SessionApi);
  private readonly session = inject(SessionStore);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Вход выполнен — куда перейти, решает страница. */
  readonly loggedIn = output<Me>();

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
    this.api.login({ login: login.trim(), password }).subscribe({
      next: (me) => {
        this.session.setMe(me);
        this.loggedIn.emit(me);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(errorText(err, 'Не удалось войти.'));
        this.form.controls.password.reset();
      },
    });
  }
}
