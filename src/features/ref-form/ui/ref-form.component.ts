import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CatalogApi, SimpleRefBody, Team } from '@entities/catalog';
import { errorText } from '@shared/api';
import { ConfirmService, ModalComponent, ToastService } from '@shared/ui';
import { REF_TEXT, RefForm } from '../model/ref-form.service';

@Component({
  selector: 'app-ref-form',
  imports: [FormsModule, ModalComponent],
  template: `
    @if (form.state(); as s) {
      <app-modal [title]="s.item ? text().one + ' «' + s.item.name + '»' : text().create" width="md:max-w-md" (closed)="form.close()">
        <form class="grid gap-5 px-6 py-5" (ngSubmit)="save()" novalidate>
          <label class="grid gap-1.5">
            <span class="text-xs text-muted">Название</span>
            <input class="field" name="name" [(ngModel)]="name" [placeholder]="text().placeholder" autocomplete="off" />
          </label>
          @if (s.kind === 'teams') {
            <label class="grid gap-1.5">
              <span class="text-xs text-muted">Бригадир</span>
              <input class="field" name="foreman" [(ngModel)]="foreman" placeholder="Необязательно" autocomplete="off" />
            </label>
          }
          <label class="grid w-32 gap-1.5">
            <span class="text-xs text-muted">Порядок в списке</span>
            <input class="field tnum" type="number" min="0" max="32767" name="sort" [(ngModel)]="sort" />
          </label>
          @if (s.item) {
            <label class="flex items-center gap-2.5">
              <input type="checkbox" class="h-4 w-4 accent-[rgb(var(--accent))]" name="hidden" [(ngModel)]="hidden" />
              <span class="text-sm">Скрыть <span class="text-muted">(не будет в выборе, старые записи не меняются)</span></span>
            </label>
          }
          @if (error()) {
            <p class="rounded-md bg-crit/10 px-3 py-2 text-sm text-crit" role="alert">{{ error() }}</p>
          }
          <div class="-mx-6 -mb-5 flex flex-wrap items-center gap-2 border-t border-line px-6 py-4">
            @if (s.item; as item) {
              @if (item.used) {
                <p class="mr-auto max-w-[60%] text-xs text-muted">{{ s.kind === 'categories' ? 'Удалить нельзя — в категории ' + item.used + ' моделей. Сначала перенесите их.' : 'Удалить нельзя — есть в ' + item.used + ' изд. Можно скрыть.' }}</p>
              } @else {
                <button type="button" class="btn-ghost mr-auto text-crit" [disabled]="saving()" (click)="remove()">Удалить</button>
              }
            }
            <button type="button" class="btn-outline ml-auto" (click)="form.close()">Отмена</button>
            <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Сохраняем…' : s.item ? 'Сохранить' : 'Добавить' }}</button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class RefFormComponent {
  readonly form = inject(RefForm);
  private readonly api = inject(CatalogApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly text = computed(() => REF_TEXT[this.form.state()?.kind ?? 'categories']);

  name = '';
  foreman = '';
  sort = 0;
  hidden = false;
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const s = this.form.state();
      if (!s) return;
      this.name = s.item?.name ?? '';
      this.foreman = s.kind === 'teams' ? ((s.item as Team | null)?.foreman ?? '') : '';
      this.sort = s.item?.sort ?? 0;
      this.hidden = s.item ? !s.item.active : false;
      this.error.set(null);
    });
  }

  async remove() {
    const s = this.form.state();
    if (!s?.item || !(await this.confirm.ask('Удалить?', `«${s.item.name}» пропадёт из справочника совсем.`, 'Удалить', true))) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.deleteSimpleRef(s.kind, s.item.id));
      this.toast.show(`«${s.item.name}» удалено`);
      this.form.saved.update((v) => v + 1);
      this.form.close();
    } catch (err) {
      this.error.set(errorText(err));
    } finally {
      this.saving.set(false);
    }
  }

  async save() {
    const s = this.form.state();
    if (!s) return;
    const name = this.name.trim();
    if (!name) return this.error.set('Впишите название.');
    const body: SimpleRefBody = { name, sort: Number(this.sort) || 0 };
    if (s.kind === 'teams') body.foreman = this.foreman.trim();
    if (s.item) body.active = !this.hidden;
    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.saveSimpleRef(s.kind, s.item?.id ?? null, body));
      this.toast.show(s.item ? `«${name}» сохранено` : `«${name}» добавлено`);
      this.form.saved.update((v) => v + 1);
      this.form.close();
    } catch (err) {
      this.error.set(errorText(err));
    } finally {
      this.saving.set(false);
    }
  }
}
