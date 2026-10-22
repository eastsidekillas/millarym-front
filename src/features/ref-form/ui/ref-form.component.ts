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
          <label class="grid content-start gap-1.5">
            <span class="text-xs text-muted">Название</span>
            <input class="field" name="name" [(ngModel)]="name" [placeholder]="text().placeholder" autocomplete="off" />
          </label>
          @if (s.kind === 'teams') {
            <label class="grid content-start gap-1.5">
              <span class="text-xs text-muted">Бригадир</span>
              <input class="field" name="foreman" [(ngModel)]="foreman" placeholder="Необязательно" autocomplete="off" />
            </label>
          }
          <label class="grid w-32 gap-1.5">
            <span class="text-xs text-muted">Порядок в списке</span>
            <input class="field tnum" type="number" min="0" max="32767" name="sort" [(ngModel)]="sort" />
          </label>
          @if (error()) {
            <p class="rounded-md bg-crit/10 px-3 py-2 text-sm text-crit" role="alert">{{ error() }}</p>
          }
          @if (s.item; as item) {
            @if (item.used) {
              <p class="text-xs text-muted">{{ s.kind === 'categories' ? 'В категории ' + item.used + ' моделей — удалить нельзя, сначала перенесите их. Можно скрыть.' : 'Есть в ' + item.used + ' изд. — удалить нельзя, можно скрыть: в выборе её не будет, старые записи не изменятся.' }}</p>
            }
          }

          <div class="-mx-6 -mb-5 flex flex-wrap items-center gap-2 border-t border-line px-6 py-4">
            @if (s.item; as item) {
              <div class="mr-auto flex flex-wrap gap-2">
                @if (!item.used) {
                  <button type="button" class="btn-danger" [disabled]="saving()" (click)="remove()">Удалить</button>
                }
                @if (item.active) {
                  <button type="button" class="btn-danger" [disabled]="saving()" (click)="setActive(false)">Скрыть</button>
                } @else {
                  <button type="button" class="btn-outline" [disabled]="saving()" (click)="setActive(true)">Вернуть в справочник</button>
                }
              </div>
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
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const s = this.form.state();
      if (!s) return;
      this.name = s.item?.name ?? '';
      this.foreman = s.kind === 'teams' ? ((s.item as Team | null)?.foreman ?? '') : '';
      this.sort = s.item?.sort ?? 0;
      this.error.set(null);
    });
  }

  async setActive(active: boolean) {
    const s = this.form.state();
    if (!s?.item) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.saveSimpleRef(s.kind, s.item.id, { active }));
      this.toast.show(active ? `«${s.item.name}» снова в справочнике` : `«${s.item.name}» скрыто`);
      this.form.saved.update((v) => v + 1);
      this.form.close();
    } catch (err) {
      this.error.set(errorText(err));
    } finally {
      this.saving.set(false);
    }
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
