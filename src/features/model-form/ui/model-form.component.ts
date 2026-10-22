import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CatalogApi, Category } from '@entities/catalog';
import { errorText } from '@shared/api';
import { ConfirmService, ModalComponent, ToastService } from '@shared/ui';
import { ModelForm } from '../model/model-form.service';

const MAX_MB = 15;

@Component({
  selector: 'app-model-form',
  imports: [FormsModule, ModalComponent],
  template: `
    @if (form.state()) {
      <app-modal [title]="editing() ? 'Модель «' + editing()!.name + '»' : 'Новая модель'" width="md:max-w-lg" (closed)="form.close()">
        <form class="grid gap-5 px-6 py-5" (ngSubmit)="save()" novalidate>
          <label class="grid content-start gap-1.5">
            <span class="text-xs text-muted">Название</span>
            <input class="field" name="name" [(ngModel)]="name" placeholder="Как в 1С, например Бостон (4 кат.)" autocomplete="off" />
          </label>
          <label class="grid content-start gap-1.5">
            <span class="text-xs text-muted">Категория</span>
            <select class="field" name="category" [(ngModel)]="category">
              <option [ngValue]="null" disabled>Выберите категорию</option>
              @for (c of categories(); track c.id) {
                <option [ngValue]="c.id">{{ c.name }}{{ c.active ? '' : ' (скрыта)' }}</option>
              }
            </select>
          </label>

          <div class="grid content-start gap-1.5">
            <span class="text-xs text-muted">Фото</span>
            <div class="flex items-start gap-4">
              <div class="flex h-24 w-36 flex-none items-center justify-center overflow-hidden rounded-lg border border-line" [class.bg-white]="preview()" [class.bg-sub]="!preview()">
                @if (preview()) {
                  <img [src]="preview()" alt="" class="h-full w-full object-contain" />
                } @else {
                  <span class="px-2 text-center text-xs text-muted">Нет фото</span>
                }
              </div>
              <div class="grid gap-2">
                <label class="btn-outline w-fit cursor-pointer">
                  {{ preview() ? 'Заменить фото' : 'Выбрать фото' }}
                  <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" (change)="pick($event)" />
                </label>
                @if (preview()) {
                  <button type="button" class="btn-ghost w-fit px-0" (click)="removePhoto()">Убрать фото</button>
                }
                <p class="text-xs text-muted">JPEG, PNG или WebP до {{ maxMb }} МБ.</p>
              </div>
            </div>
          </div>

          <div class="grid content-start gap-1.5">
            <span class="text-xs text-muted">Своя комплектация</span>
            <p class="text-xs text-muted">Кнопки при заведении изделия этой модели, рядом с общими («Левый угол», «Накладки…»). Например, «Подушки-подголовники 3 шт.»</p>
            @if (kitOptions().length) {
              <div class="flex flex-wrap gap-1.5">
                @for (k of kitOptions(); track k) {
                  <span class="chip h-7 gap-1.5 pr-1.5">
                    {{ k }}
                    <button type="button" class="text-muted hover:text-crit" [attr.aria-label]="'Убрать ' + k" (click)="removeKit(k)">×</button>
                  </span>
                }
              </div>
            }
            <div class="flex gap-2">
              <input class="field" name="kitDraft" [ngModel]="kitDraft()" (ngModelChange)="kitDraft.set($event)" (keydown.enter)="$event.preventDefault(); addKit()" placeholder="Новая кнопка" maxlength="120" autocomplete="off" />
              <button type="button" class="btn-outline flex-none" (click)="addKit()">Добавить</button>
            </div>
          </div>

          @if (error()) {
            <p class="rounded-md bg-crit/10 px-3 py-2 text-sm text-crit" role="alert">{{ error() }}</p>
          }

          @if (editing(); as m) {
            @if (m.used) {
              <p class="text-xs text-muted">Модель есть в {{ m.used }} изд. — удалить нельзя, можно скрыть: в выборе при заведении её не будет, старые изделия не изменятся.</p>
            }
          }

          <div class="-mx-6 -mb-5 flex flex-wrap items-center gap-2 border-t border-line px-6 py-4">
            @if (editing(); as m) {
              <div class="mr-auto flex flex-wrap gap-2">
                @if (!m.used) {
                  <button type="button" class="btn-danger" [disabled]="saving()" (click)="remove()">Удалить</button>
                }
                @if (m.active) {
                  <button type="button" class="btn-danger" [disabled]="saving()" (click)="setActive(false)">Скрыть</button>
                } @else {
                  <button type="button" class="btn-outline" [disabled]="saving()" (click)="setActive(true)">Вернуть в справочник</button>
                }
              </div>
            }
            <button type="button" class="btn-outline ml-auto" (click)="form.close()">Отмена</button>
            <button type="submit" class="btn-primary" [disabled]="saving()">{{ saving() ? 'Сохраняем…' : editing() ? 'Сохранить' : 'Добавить' }}</button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class ModelFormComponent {
  readonly form = inject(ModelForm);
  private readonly api = inject(CatalogApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly maxMb = MAX_MB;
  readonly editing = computed(() => {
    const s = this.form.state();
    return s?.mode === 'edit' ? s.model : null;
  });
  readonly categories = signal<Category[]>([]);

  name = '';
  category: number | null = null;
  private file: File | null = null;
  private removed = false;
  readonly preview = signal<string | null>(null);
  readonly kitOptions = signal<string[]>([]);
  readonly kitDraft = signal('');
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const state = this.form.state();
      if (!state) return;
      const m = this.editing();
      this.name = m?.name ?? '';
      this.category = m?.category ?? (state.mode === 'create' ? (state.category ?? null) : null);
      this.file = null;
      this.removed = false;
      this.preview.set(m?.photo_thumb ?? null);
      this.kitOptions.set(m?.kit_options ?? []);
      this.kitDraft.set('');
      this.error.set(null);
      firstValueFrom(this.api.categories()).then((list) => this.categories.set(list));
    });
  }

  pick(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      this.error.set(`Фото больше ${MAX_MB} МБ. Выберите файл поменьше.`);
      return;
    }
    this.file = file;
    this.removed = false;
    this.error.set(null);
    this.preview.set(URL.createObjectURL(file));
  }

  addKit() {
    const option = this.kitDraft().replace(/\s+/g, ' ').trim();
    if (!option) return;
    if (option.includes(',')) return this.error.set('В кнопке комплектации без запятых: например, «Подушки-подголовники 3 шт.»');
    if (!this.kitOptions().some((k) => k.toLowerCase() === option.toLowerCase())) this.kitOptions.set([...this.kitOptions(), option]);
    this.kitDraft.set('');
    this.error.set(null);
  }

  removeKit(option: string) {
    this.kitOptions.set(this.kitOptions().filter((k) => k !== option));
  }

  removePhoto() {
    this.file = null;
    this.removed = true;
    this.preview.set(null);
  }

  async setActive(active: boolean) {
    const model = this.editing();
    if (!model) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.updateModel(model.id, { active }));
      this.toast.show(active ? `Модель «${model.name}» снова в справочнике` : `Модель «${model.name}» скрыта из справочника`);
      this.form.saved.update((v) => v + 1);
      this.form.close();
    } catch (err) {
      this.error.set(errorText(err));
    } finally {
      this.saving.set(false);
    }
  }

  async remove() {
    const model = this.editing();
    if (!model || !(await this.confirm.ask('Удалить модель?', `«${model.name}» пропадёт из справочника совсем.`, 'Удалить', true))) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.deleteModel(model.id));
      this.toast.show(`Модель «${model.name}» удалена`);
      this.form.saved.update((v) => v + 1);
      this.form.close();
    } catch (err) {
      this.error.set(errorText(err));
    } finally {
      this.saving.set(false);
    }
  }

  async save() {
    if (this.kitDraft().trim()) this.addKit();
    if (this.error()) return;
    const name = this.name.trim();
    if (!name) return this.error.set('Впишите название модели.');
    if (!this.category) return this.error.set('Выберите категорию.');
    this.saving.set(true);
    this.error.set(null);
    try {
      const model = this.editing();
      const body = new FormData();
      body.append('name', name);
      body.append('category', String(this.category));
      if (this.file) body.append('photo', this.file);
      if (model) {
        await firstValueFrom(this.api.updateModel(model.id, body));
        if (this.removed && model.photo) await firstValueFrom(this.api.updateModel(model.id, { photo: null }));
        await firstValueFrom(this.api.updateModel(model.id, { kit_options: this.kitOptions() }));
        this.toast.show(`Модель «${name}» сохранена`);
      } else {
        const created = await firstValueFrom(this.api.createModel(body));
        if (this.kitOptions().length) await firstValueFrom(this.api.updateModel(created.id, { kit_options: this.kitOptions() }));
        this.toast.show(`Модель «${name}» добавлена`);
      }
      this.form.saved.update((v) => v + 1);
      this.form.close();
    } catch (err) {
      this.error.set(errorText(err));
    } finally {
      this.saving.set(false);
    }
  }
}
