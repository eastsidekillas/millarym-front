import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CatalogApi, Category, SimpleRef, SimpleRefKind, Team } from '@entities/catalog';
import { SessionStore } from '@entities/session';
import { RefForm } from '@features/ref-form';
import { errorText } from '@shared/api';
import { ToastService } from '@shared/ui';

const ADD: Record<SimpleRefKind, string> = {
  categories: 'Добавить категорию',
  'kit-options': 'Добавить кнопку',
  teams: 'Добавить бригаду',
};

const HINT: Record<SimpleRefKind, string> = {
  categories: 'Категории группируют модели в справочнике, фильтрах и отчётах.',
  'kit-options': 'Быстрые кнопки в форме изделия: нажатие дописывает текст в «Комплектацию».',
  teams: 'Бригаду выбирают, когда изделие выдают в работу.',
};

@Component({
  selector: 'app-simple-tab',
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="max-w-[72ch] text-sm text-muted">{{ hint[kind()] }}</p>
      @if (canEdit) {
        <button type="button" class="btn-primary" (click)="form.open(kind())">{{ add[kind()] }}</button>
      }
    </div>
    <div class="relative overflow-x-auto rounded-lg border border-line bg-surface" [class.opacity-60]="loading()">
      <table class="w-full min-w-[520px] text-sm">
        <thead>
          <tr class="border-b border-line text-left text-xs text-muted">
            <th class="px-4 py-2.5 font-normal">Название</th>
            @if (kind() === 'teams') {
              <th class="px-3 py-2.5 font-normal">Бригадир</th>
            }
            @if (kind() === 'categories') {
              <th class="w-28 px-3 py-2.5 text-right font-normal">Моделей</th>
            }
            <th class="w-24 px-3 py-2.5 text-right font-normal">Порядок</th>
            <th class="w-28 py-2.5 pl-3 pr-4 font-normal"><span class="sr-only">Действие</span></th>
          </tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.id) {
            <tr class="border-b border-line last:border-0" [class.text-muted]="!r.active">
              <td class="px-4 py-2.5">
                <span class="font-medium" [class.text-ink]="r.active">{{ r.name }}</span>
                @if (!r.active) {
                  <span class="ml-2 text-xs">скрыта</span>
                }
              </td>
              @if (kind() === 'teams') {
                <td class="px-3 py-2.5">{{ asTeam(r).foreman || '—' }}</td>
              }
              @if (kind() === 'categories') {
                <td class="tnum px-3 py-2.5 text-right">
                  <button type="button" class="text-accent hover:underline" (click)="openCategory.emit(r.id)">{{ asCategory(r).models_count }}</button>
                </td>
              }
              <td class="tnum px-3 py-2.5 text-right">{{ r.sort }}</td>
              <td class="py-2 pl-3 pr-4 text-right">
                @if (canEdit) {
                  <button type="button" class="btn-ghost h-8" (click)="form.open(kind(), r)">Изменить</button>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="px-4 py-12 text-center text-muted">{{ loading() ? 'Загружаем…' : 'Пока пусто' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class SimpleTabComponent {
  private readonly api = inject(CatalogApi);
  private readonly toast = inject(ToastService);
  readonly form = inject(RefForm);
  readonly canEdit = inject(SessionStore).can('catalog');

  readonly kind = input.required<SimpleRefKind>();
  readonly openCategory = output<number>();
  readonly rows = signal<SimpleRef[]>([]);
  readonly loading = signal(true);
  readonly add = ADD;
  readonly hint = HINT;

  constructor() {
    effect(() => {
      const kind = this.kind();
      this.form.saved();
      this.api.changed();
      untracked(() => this.load(kind));
    });
  }

  private async load(kind: SimpleRefKind) {
    this.loading.set(true);
    try {
      this.rows.set(await firstValueFrom(this.api.simpleRefs(kind)));
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось загрузить справочник.'));
    } finally {
      this.loading.set(false);
    }
  }

  asTeam(r: SimpleRef): Team {
    return r as Team;
  }

  asCategory(r: SimpleRef): Category {
    return r as Category;
  }
}
