import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CatalogApi } from '@entities/catalog';
import { errorText } from '@shared/api';
import { ConfirmService, ModalComponent, ToastService } from '@shared/ui';
import { FabricForm } from '../model/fabric-form.service';

const MAX_MB = 15;

@Component({
  selector: 'app-fabric-form',
  imports: [FormsModule, ModalComponent],
  template: `
    @if (form.state()) {
      <app-modal [title]="editing() ? 'Ткань «' + editing()!.name + '»' : 'Новая ткань'" width="md:max-w-lg" (closed)="form.close()">
        <form class="grid gap-5 px-6 py-5" (ngSubmit)="save()" novalidate>
          <label class="grid gap-1.5">
            <span class="text-xs text-muted">Название</span>
            <input class="field" name="name" [(ngModel)]="name" placeholder="Как на ярлыке рулона, например kioto beige" autocomplete="off" />
          </label>

          <div class="grid gap-1.5">
            <span class="text-xs text-muted">Фото</span>
            <div class="flex items-start gap-4">
              <div class="flex h-28 w-28 flex-none items-center justify-center overflow-hidden rounded-lg border border-line bg-sub">
                @if (preview()) {
                  <img [src]="preview()" alt="" class="h-full w-full object-cover" />
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
                <p class="text-xs text-muted">JPEG, PNG или WebP до {{ maxMb }} МБ. Сервер сам уменьшит фото.</p>
              </div>
            </div>
          </div>

          @if (error()) {
            <p class="rounded-md bg-crit/10 px-3 py-2 text-sm text-crit" role="alert">{{ error() }}</p>
          }

          @if (editing(); as f) {
            @if (f.used) {
              <p class="text-xs text-muted">Ткань есть в {{ f.used }} изд. — удалить нельзя, можно скрыть: в выборе при заведении её не будет, старые изделия не изменятся.</p>
            }
          }

          <div class="-mx-6 -mb-5 flex flex-wrap items-center gap-2 border-t border-line px-6 py-4">
            @if (editing(); as f) {
              <div class="mr-auto flex flex-wrap gap-2">
                @if (!f.used) {
                  <button type="button" class="btn-danger" [disabled]="saving()" (click)="remove()">Удалить</button>
                }
                @if (f.active) {
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
export class FabricFormComponent {
  readonly form = inject(FabricForm);
  private readonly api = inject(CatalogApi);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly maxMb = MAX_MB;
  readonly editing = computed(() => {
    const s = this.form.state();
    return s?.mode === 'edit' ? s.fabric : null;
  });

  name = '';
  private file: File | null = null;
  private removed = false;
  readonly preview = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (!this.form.state()) return;
      const f = this.editing();
      this.name = f?.name ?? '';
      this.file = null;
      this.removed = false;
      this.preview.set(f?.photo_thumb ?? null);
      this.error.set(null);
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

  async setActive(active: boolean) {
    const fabric = this.editing();
    if (!fabric) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.updateFabric(fabric.id, { active }));
      this.toast.show(active ? `Ткань «${fabric.name}» снова в справочнике` : `Ткань «${fabric.name}» скрыта из справочника`);
      this.form.saved.update((v) => v + 1);
      this.form.close();
    } catch (err) {
      this.error.set(errorText(err));
    } finally {
      this.saving.set(false);
    }
  }

  async remove() {
    const fabric = this.editing();
    if (!fabric || !(await this.confirm.ask('Удалить ткань?', `«${fabric.name}» и её фото пропадут из справочника совсем.`, 'Удалить', true))) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.deleteFabric(fabric.id));
      this.toast.show(`Ткань «${fabric.name}» удалена`);
      this.form.saved.update((v) => v + 1);
      this.form.close();
    } catch (err) {
      this.error.set(errorText(err));
    } finally {
      this.saving.set(false);
    }
  }

  async save() {
    const name = this.name.trim();
    if (!name) {
      this.error.set('Впишите название ткани.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      const fabric = this.editing();
      const body = new FormData();
      body.append('name', name);
      if (this.file) body.append('photo', this.file);
      if (fabric) {
        await firstValueFrom(this.api.updateFabric(fabric.id, body));
        if (this.removed && fabric.photo) await firstValueFrom(this.api.updateFabric(fabric.id, { photo: null }));
        this.toast.show(`Ткань «${name}» сохранена`);
      } else {
        await firstValueFrom(this.api.createFabric(body));
        this.toast.show(`Ткань «${name}» добавлена`);
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
