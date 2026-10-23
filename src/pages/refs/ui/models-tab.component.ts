import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CatalogApi, Category, ProductModel } from '@entities/catalog';
import { SessionStore } from '@entities/session';
import { ModelForm } from '@features/model-form';
import { errorText } from '@shared/api';
import { ToastService } from '@shared/ui';

const norm = (text: string) => text.toLowerCase().replaceAll('ё', 'е');

@Component({
  selector: 'app-models-tab',
  template: `
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <input type="search" class="field sm:max-w-xs" placeholder="Название модели" aria-label="Поиск модели" (input)="search.set($any($event.target).value)" />
      <select class="field pr-8 sm:w-auto" aria-label="Категория" (change)="setCategory($any($event.target).value)">
        <option value="">Все категории</option>
        @for (c of categories(); track c.id) {
          <option [value]="c.id" [selected]="c.id === +category()">{{ c.name }} ({{ c.models_count }})</option>
        }
      </select>
      <label class="ml-1 flex items-center gap-2 text-sm">
        <input type="checkbox" class="h-4 w-4 accent-[rgb(var(--accent))]" [checked]="showHidden()" (change)="showHidden.set($any($event.target).checked)" />
        Показать скрытые
      </label>
      <p class="text-sm text-muted sm:ml-auto">Показано: <span class="tnum">{{ shown().length }}</span> из <span class="tnum">{{ activeCount() }}</span></p>
      @if (canEdit) {
        <button type="button" class="btn-primary" (click)="form.create(category() ? +category() : undefined)">Добавить модель</button>
      }
    </div>

    <div class="relative overflow-x-auto rounded-lg border border-line bg-surface" [class.opacity-60]="loading()">
      <table class="w-full min-w-[640px] text-sm">
        <thead>
          <tr class="border-b border-line text-left text-xs text-muted">
            <th class="hidden w-14 py-2.5 pl-4 font-normal sm:table-cell"><span class="sr-only">Фото</span></th>
            <th class="px-3 py-2.5 font-normal">Название</th>
            <th class="w-56 px-3 py-2.5 font-normal">Категория</th>
            <th class="w-28 px-3 py-2.5 text-right font-normal">В работе</th>
            <th class="w-28 py-2.5 pl-3 pr-4 font-normal"><span class="sr-only">Действие</span></th>
          </tr>
        </thead>
        <tbody>
          @for (m of shown(); track m.id) {
            <tr class="border-b border-line last:border-0" [class.text-muted]="!m.active">
              <td class="hidden py-2 pl-4 sm:table-cell">
                @if (m.photo_thumb) {
                  <a [href]="m.photo" target="_blank" rel="noopener" title="Открыть фото" class="block">
                    <img [src]="m.photo_thumb" [alt]="m.name" class="h-9 w-12 rounded bg-white object-contain ring-1 ring-line" loading="lazy" />
                  </a>
                } @else {
                  <div class="h-9 w-12 rounded bg-sub"></div>
                }
              </td>
              <td class="py-2 pl-4 pr-3 sm:px-3">
                <span class="font-medium" [class.text-ink]="m.active">{{ m.name }}</span>
                @if (!m.active) {
                  <span class="ml-2 text-xs">скрыта</span>
                }
              </td>
              <td class="px-3 py-2">
                @if (canEdit) {
                  <select class="select-sm w-full" [attr.aria-label]="'Категория модели ' + m.name" [disabled]="busy() === m.id" (change)="changeCategory(m, $any($event.target))">
                    @for (c of categories(); track c.id) {
                      <option [value]="c.id" [selected]="c.id === m.category">{{ c.name }}</option>
                    }
                  </select>
                } @else {
                  {{ m.category_name }}
                }
              </td>
              <td class="tnum px-3 py-2 text-right">{{ m.in_work || '—' }}</td>
              <td class="py-2 pl-3 pr-4 text-right">
                @if (canEdit) {
                  <button type="button" class="btn-ghost h-8" (click)="form.edit(m)">Изменить</button>
                }
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="px-4 py-12 text-center text-muted">{{ loading() ? 'Загружаем…' : 'Таких моделей нет' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class ModelsTabComponent {
  private readonly api = inject(CatalogApi);
  private readonly toast = inject(ToastService);
  readonly form = inject(ModelForm);
  readonly canEdit = inject(SessionStore).can('catalog');

  readonly models = signal<ProductModel[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly busy = signal<number | null>(null);
  readonly search = signal('');
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  readonly category = computed(() => this.params().get('category') ?? '');
  readonly showHidden = signal(false);

  readonly activeCount = computed(() => this.models().filter((m) => m.active).length);
  readonly shown = computed(() => {
    const words = norm(this.search()).split(/\s+/).filter(Boolean);
    const category = Number(this.category()) || null;
    return this.models().filter(
      (m) =>
        (this.showHidden() || m.active) &&
        (!category || m.category === category) &&
        words.every((w) => norm(m.name).includes(w)),
    );
  });

  constructor() {
    effect(() => {
      this.form.saved();
      this.api.changed();
      untracked(() => this.load());
    });
  }

  private async load() {
    this.loading.set(true);
    try {
      const [models, categories] = await Promise.all([firstValueFrom(this.api.allModels()), firstValueFrom(this.api.categories())]);
      this.models.set(models);
      this.categories.set(categories);
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось загрузить модели.'));
    } finally {
      this.loading.set(false);
    }
  }

  setCategory(id: string) {
    this.router.navigate([], { queryParams: { category: id || null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  async changeCategory(model: ProductModel, select: HTMLSelectElement) {
    const category = Number(select.value);
    if (category === model.category) return;
    this.busy.set(model.id);
    try {
      const saved = await firstValueFrom(this.api.updateModel(model.id, { category }));
      this.models.update((list) => list.map((m) => (m.id === saved.id ? { ...m, category: saved.category, category_name: saved.category_name } : m)));
      this.categories.update((list) =>
        list.map((c) => ({ ...c, models_count: c.models_count + (c.id === category ? 1 : c.id === model.category ? -1 : 0) * (model.active ? 1 : 0) })),
      );
      this.toast.show(`«${model.name}»: ${saved.category_name}`);
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось сменить категорию.'));
      select.value = String(model.category);
    } finally {
      this.busy.set(null);
    }
  }
}
