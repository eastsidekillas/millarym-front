import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CatalogApi, Deadlines } from '@entities/catalog';
import { SessionStore } from '@entities/session';
import { errorText } from '@shared/api';
import { ToastService } from '@shared/ui';

const FIELDS: { key: keyof Deadlines; label: string; hint: string }[] = [
  { key: 'fabric_days', label: 'Ткань', hint: 'Индивидуальный заказ на «Заказах» без отметки «Ткань пришла» дольше этого — просрочен.' },
  { key: 'cut_days', label: 'Крой', hint: 'Не отшит (на «Заказах» или «Крое») дольше этого — просрочен.' },
  { key: 'output_days', label: 'Выпуск', hint: 'Срок заказа: столько дней от заведения до выпуска на СГП.' },
  { key: 'trash_days', label: 'Корзина', hint: 'Сколько дней изделие лежит в Корзине, потом удаляется окончательно.' },
];

@Component({
  selector: 'app-deadlines-tab',
  imports: [FormsModule],
  template: `
    <p class="mb-4 max-w-[72ch] text-sm text-muted">Сроки считаются в днях от даты заведения изделия и действуют только для индивидуальных заказов, кроме срока Корзины.</p>
    @if (values(); as v) {
      <form class="grid max-w-2xl gap-4 rounded-lg border border-line bg-surface p-5" (ngSubmit)="save()" novalidate>
        @for (f of fields; track f.key) {
          <label class="grid gap-x-4 gap-y-1 sm:grid-cols-[120px_100px_1fr] sm:items-center">
            <span class="text-sm font-medium">{{ f.label }}</span>
            <span class="flex items-center gap-2">
              <input class="field tnum w-20" type="number" min="1" max="365" [attr.name]="f.key" [(ngModel)]="v[f.key]" [ngModelOptions]="{ standalone: true }" [disabled]="!canEdit" />
              <span class="text-sm text-muted">дн.</span>
            </span>
            <span class="text-xs text-muted">{{ f.hint }}</span>
          </label>
        }
        @if (error()) {
          <p class="rounded-md bg-crit/10 px-3 py-2 text-sm text-crit" role="alert">{{ error() }}</p>
        }
        @if (canEdit) {
          <div class="flex justify-end border-t border-line pt-4">
            <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Сохраняем…' : 'Сохранить сроки' }}</button>
          </div>
        }
      </form>
    } @else {
      <p class="text-sm text-muted">Загружаем…</p>
    }
  `,
})
export class DeadlinesTabComponent {
  private readonly api = inject(CatalogApi);
  private readonly toast = inject(ToastService);
  readonly canEdit = inject(SessionStore).can('catalog');
  readonly fields = FIELDS;
  readonly values = signal<Deadlines | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    firstValueFrom(this.api.deadlines()).then((d) => this.values.set({ ...d }));
  }

  async save() {
    const v = this.values();
    if (!v) return;
    const body = Object.fromEntries(FIELDS.map((f) => [f.key, Number(v[f.key])])) as unknown as Deadlines;
    if (Object.values(body).some((n) => !Number.isInteger(n) || n < 1 || n > 365)) {
      return this.error.set('Каждый срок — целое число дней от 1 до 365.');
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      this.values.set({ ...(await firstValueFrom(this.api.updateDeadlines(body))) });
      this.toast.show('Сроки сохранены');
    } catch (err) {
      this.error.set(errorText(err));
    } finally {
      this.saving.set(false);
    }
  }
}
