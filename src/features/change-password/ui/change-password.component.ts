import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SessionApi } from '@entities/session';
import { errorText } from '@shared/api';
import { ModalComponent, ToastService } from '@shared/ui';
import { ChangePassword } from '../model/change-password.service';

@Component({
  selector: 'app-change-password',
  imports: [FormsModule, ModalComponent],
  template: `
    @if (dialog.opened()) {
      <app-modal title="Смена пароля" width="md:max-w-md" (closed)="dialog.close()">
        <form class="grid gap-5 px-6 py-5" (ngSubmit)="save()" novalidate>
          <label class="grid content-start gap-1.5">
            <span class="text-xs text-muted">Текущий пароль</span>
            <input class="field" type="password" name="old" [(ngModel)]="old" autocomplete="current-password" />
          </label>
          <label class="grid content-start gap-1.5">
            <span class="text-xs text-muted">Новый пароль</span>
            <input class="field" type="password" name="new" [(ngModel)]="fresh" autocomplete="new-password" />
            <span class="text-xs text-muted">Не короче 8 символов, не только цифры и не похож на логин.</span>
          </label>
          <label class="grid content-start gap-1.5">
            <span class="text-xs text-muted">Новый пароль ещё раз</span>
            <input class="field" type="password" name="repeat" [(ngModel)]="repeat" autocomplete="new-password" />
          </label>
          @if (error()) {
            <p class="rounded-md bg-crit/10 px-3 py-2 text-sm text-crit" role="alert">{{ error() }}</p>
          }
          <div class="-mx-6 -mb-5 flex justify-end gap-2 border-t border-line px-6 py-4">
            <button type="button" class="btn-outline" (click)="dialog.close()">Отмена</button>
            <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Сохраняем…' : 'Сменить пароль' }}</button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class ChangePasswordComponent {
  readonly dialog = inject(ChangePassword);
  private readonly api = inject(SessionApi);
  private readonly toast = inject(ToastService);

  old = '';
  fresh = '';
  repeat = '';
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.dialog.opened()) return;
      this.old = this.fresh = this.repeat = '';
      this.error.set(null);
    });
  }

  async save() {
    if (!this.old || !this.fresh) return this.error.set('Заполните текущий и новый пароль.');
    if (this.fresh !== this.repeat) return this.error.set('Новый пароль и повтор не совпадают.');
    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.changePassword({ old_password: this.old, new_password: this.fresh }));
      this.toast.show('Пароль изменён');
      this.dialog.close();
    } catch (err) {
      this.error.set(errorText(err));
    } finally {
      this.saving.set(false);
    }
  }
}
