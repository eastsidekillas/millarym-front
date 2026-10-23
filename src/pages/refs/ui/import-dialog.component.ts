import { Component, inject, model, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CatalogApi, CatalogImport } from '@entities/catalog';
import { errorText } from '@shared/api';
import { ModalComponent, ToastService } from '@shared/ui';

/** Загрузить справочники из Excel: сначала проверка («что изменится»), потом — запись. */
@Component({
  selector: 'app-import-dialog',
  imports: [ModalComponent],
  template: `
    @if (open()) {
      <app-modal title="Загрузить справочники из Excel" subtitle="Файл, выгруженный кнопкой «Выгрузить в Excel» и исправленный" width="md:max-w-2xl" (closed)="close()">
        <div class="grid gap-4 px-6 py-5">
          <label class="grid content-start gap-1.5">
            <span class="text-sm">Файл .xlsx</span>
            <input type="file" class="text-sm" accept=".xlsx" [disabled]="busy()" (change)="pick($event)" />
          </label>

          @if (report(); as r) {
            @if (r.applied) {
              <p class="rounded-lg bg-good/10 px-4 py-3 text-sm text-good" role="status">Готово — справочники обновлены.</p>
            } @else if (r.has_errors) {
              <p class="rounded-lg bg-crit/10 px-4 py-3 text-sm text-crit" role="alert">Есть ошибки — ничего не изменено. Исправьте файл и выберите его снова.</p>
            } @else if (!hasChanges(r)) {
              <p class="rounded-lg bg-sub px-4 py-3 text-sm">В файле нет изменений.</p>
            } @else {
              <p class="text-sm">Проверка прошла. Вот что изменится:</p>
            }
            @if (r.foreign) {
              <p class="text-[13px] text-muted">
                Файл выгружен из другой базы (другой сервер) или старой версией программы — записи сопоставлены по названиям.
                Переименование в таком файле станет новой записью.
              </p>
            }
            <div class="grid gap-3">
              @for (s of r.sheets; track s.title) {
                <section class="rounded-lg border border-line px-4 py-3">
                  <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 class="text-sm font-semibold">{{ s.title }}</h3>
                    <span class="text-xs text-muted">
                      @if (s.skipped) {
                        {{ s.skipped }}
                      } @else {
                        новых {{ s.created.length }} · изменено {{ s.updated.length }} · без изменений {{ s.unchanged }}
                      }
                    </span>
                  </div>
                  @if (s.errors.length) {
                    <ul class="mt-2 grid gap-1 text-[13px] text-crit">
                      @for (e of s.errors; track $index) { <li>{{ e }}</li> }
                    </ul>
                  }
                  @if (s.created.length) {
                    <p class="mt-2 text-[13px]"><span class="text-muted">Новые:</span> {{ s.created.join(', ') }}</p>
                  }
                  @if (s.updated.length) {
                    <ul class="mt-2 grid gap-1 text-[13px]">
                      @for (u of s.updated; track $index) { <li>{{ u }}</li> }
                    </ul>
                  }
                </section>
              }
            </div>
          }
        </div>
        <div class="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">
          <button type="button" class="btn-outline" (click)="close()">{{ report()?.applied ? 'Закрыть' : 'Отмена' }}</button>
          @if (!report()?.applied) {
            <button type="button" class="btn-primary" [disabled]="!canApply()" (click)="apply()">
              {{ busy() ? 'Загружаем…' : 'Загрузить' }}
            </button>
          }
        </div>
      </app-modal>
    }
  `,
})
export class ImportDialogComponent {
  private readonly api = inject(CatalogApi);
  private readonly toast = inject(ToastService);
  readonly open = model(false);
  readonly busy = signal(false);
  readonly report = signal<CatalogImport | null>(null);
  private file: File | null = null;

  hasChanges(r: CatalogImport): boolean {
    return r.sheets.some((s) => s.created.length || s.updated.length);
  }

  canApply(): boolean {
    const r = this.report();
    return !!r && !this.busy() && !r.has_errors && !r.applied && this.hasChanges(r);
  }

  async pick(event: Event) {
    this.file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.report.set(null);
    if (this.file) await this.send(true);
  }

  apply() {
    return this.send(false);
  }

  private async send(dryRun: boolean) {
    if (!this.file) return;
    this.busy.set(true);
    try {
      this.report.set(await firstValueFrom(this.api.importXlsx(this.file, dryRun)));
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось проверить файл.'));
    } finally {
      this.busy.set(false);
    }
  }

  close() {
    this.open.set(false);
    this.report.set(null);
    this.file = null;
  }
}
