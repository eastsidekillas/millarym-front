import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CatalogApi, Category } from '@entities/catalog';
import { errorText } from '@shared/api';
import { ModalComponent, ToastService } from '@shared/ui';
import { ModelForm } from '../model/model-form.service';

const MAX_MB = 15;

@Component({
  selector: 'app-model-form',
  imports: [FormsModule, ModalComponent],
  template: `
    @if (form.state()) {
      <app-modal [title]="editing() ? 'Модель «' + editing()!.name + '»' : 'Новая модель'" width="md:max-w-lg" (closed)="form.close()">
        <form class="grid gap-5 px-6 py-5" (ngSubmit)="save()" novalidate>
          <label class="grid gap-1.5">
            <span class="text-xs text-muted">Название</span>
            <input class="field" name="name" [(ngModel)]="name" placeholder="Как в 1С, например Бостон (4 кат.)" autocomplete="off" />
          </label>
          <label class="grid gap-1.5">
            <span class="text-xs text-muted">Категория</span>
            <select class="field" name="category" [(ngModel)]="category">
              <option [ngValue]="null" disabled>Выберите категорию</option>
              @for (c of categories(); track c.id) {
                <option [ngValue]="c.id">{{ c.name }}{{ c.active ? '' : ' (скрыта)' }}</option>
              }
            </select>
          </label>

          <div class="grid gap-1.5">
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

          @if (editing(); as m) {
            <label class="flex items-start gap-2.5">
              <input type="checkbox" class="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]" name="hidden" [(ngModel)]="hidden" />
              <span class="text-sm">
                Скрыть из справочника
                <span class="block text-muted">Не будет в выборе при заведении.{{ m.in_work ? ' Изделия в работе (' + m.in_work + ') останутся с этой моделью.' : '' }}</span>
              </span>
            </label>
          }

          @if (error()) {
            <p class="rounded-md bg-crit/10 px-3 py-2 text-sm text-crit" role="alert">{{ error() }}</p>
          }

          <div class="-mx-6 -mb-5 flex justify-end gap-2 border-t border-line px-6 py-4">
            <button type="button" class="btn-outline" (click)="form.close()">Отмена</button>
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

  readonly maxMb = MAX_MB;
  readonly editing = computed(() => {
    const s = this.form.state();
    return s?.mode === 'edit' ? s.model : null;
  });
  readonly categories = signal<Category[]>([]);

  name = '';
  category: number | null = null;
  hidden = false;
  private file: File | null = null;
  private removed = false;
  readonly preview = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const state = this.form.state();
      if (!state) return;
      const m = this.editing();
      this.name = m?.name ?? '';
      this.category = m?.category ?? (state.mode === 'create' ? (state.category ?? null) : null);
      this.hidden = m ? !m.active : false;
      this.file = null;
      this.removed = false;
      this.preview.set(m?.photo_thumb ?? null);
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

  removePhoto() {
    this.file = null;
    this.removed = true;
    this.preview.set(null);
  }

  async save() {
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
        body.append('active', String(!this.hidden));
        await firstValueFrom(this.api.updateModel(model.id, body));
        if (this.removed && model.photo) await firstValueFrom(this.api.updateModel(model.id, { photo: null }));
        this.toast.show(`Модель «${name}» сохранена`);
      } else {
        await firstValueFrom(this.api.createModel(body));
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
