import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CatalogApi } from '@entities/catalog';
import { SessionStore } from '@entities/session';
import { ModelFormComponent } from '@features/model-form';
import { RefFormComponent } from '@features/ref-form';
import { errorText } from '@shared/api';
import { filenameFrom, saveBlob } from '@shared/lib';
import { ToastService } from '@shared/ui';
import { DeadlinesTabComponent } from './deadlines-tab.component';
import { ImportDialogComponent } from './import-dialog.component';
import { ModelsTabComponent } from './models-tab.component';
import { SimpleTabComponent } from './simple-tab.component';

const TABS = [
  { id: 'models', title: 'Модели' },
  { id: 'categories', title: 'Категории' },
  { id: 'teams', title: 'Бригады' },
  { id: 'kit-options', title: 'Комплектация' },
  { id: 'deadlines', title: 'Сроки' },
] as const;
type TabId = (typeof TABS)[number]['id'];

@Component({
  selector: 'app-refs-page',
  imports: [ModelsTabComponent, SimpleTabComponent, DeadlinesTabComponent, ModelFormComponent, RefFormComponent, ImportDialogComponent],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <h1 class="text-xl font-semibold leading-9">Справочники</h1>
        @if (!canEdit) {
          <p class="text-sm text-muted">Менять справочники могут: директор и руководитель швейного цеха.</p>
        }
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-outline" [disabled]="exporting()" (click)="exportXlsx()">{{ exporting() ? 'Готовим файл…' : 'Выгрузить в Excel' }}</button>
        @if (canImport) {
          <button type="button" class="btn-outline" (click)="importOpen.set(true)">Загрузить из Excel…</button>
        }
      </div>
    </div>

    <div class="mt-4 flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label="Справочники">
      @for (t of tabs; track t.id) {
        <button
          type="button"
          role="tab"
          class="-mb-px h-10 whitespace-nowrap border-b-2 px-3 text-sm"
          [class]="tab() === t.id ? 'border-accent font-medium text-ink' : 'border-transparent text-muted hover:text-ink'"
          [attr.aria-selected]="tab() === t.id"
          (click)="select(t.id)"
        >
          {{ t.title }}
        </button>
      }
      <span class="ml-auto self-center whitespace-nowrap pl-4 text-xs text-muted">Ткани — в разделе «Ткани»</span>
    </div>

    <div class="mt-4">
      @switch (tab()) {
        @case ('models') {
          <app-models-tab />
        }
        @case ('deadlines') {
          <app-deadlines-tab />
        }
        @default {
          <app-simple-tab [kind]="$any(tab())" (openCategory)="openCategory($event)" />
        }
      }
    </div>

    <app-model-form />
    <app-ref-form />
    <app-import-dialog [(open)]="importOpen" />
  `,
})
export class RefsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogApi);
  private readonly toast = inject(ToastService);
  readonly canEdit = inject(SessionStore).can('catalog');
  // ткани тоже лежат в файле — их может загрузить тот, у кого право на ткани
  readonly canImport = this.canEdit || inject(SessionStore).can('fabrics');
  readonly exporting = signal(false);
  readonly importOpen = signal(false);

  async exportXlsx() {
    this.exporting.set(true);
    try {
      const response = await firstValueFrom(this.catalog.exportXlsx());
      saveBlob(response.body!, filenameFrom(response, 'Справочники.xls'));
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось выгрузить справочники.'));
    } finally {
      this.exporting.set(false);
    }
  }
  readonly tabs = TABS;

  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  readonly tab = computed<TabId>(() => {
    const t = this.params().get('tab');
    return TABS.some((x) => x.id === t) ? (t as TabId) : 'models';
  });

  select(tab: TabId) {
    this.router.navigate([], { queryParams: { tab: tab === 'models' ? null : tab } });
  }

  openCategory(id: number) {
    this.router.navigate([], { queryParams: { tab: null, category: id } });
  }
}
