import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CatalogApi } from '@entities/catalog';
import { ModelCount, ReportApi, ReportInfo, ReportParams, ReportResult, ReportRow } from '@entities/report';
import { errorText } from '@shared/api';
import { factoryDay } from '@shared/lib';
import { ToastService } from '@shared/ui';
import { ModelPickerComponent } from './model-picker.component';

interface Block {
  group: string;
  rows: ReportRow[];
}

@Component({
  selector: 'app-reports-page',
  imports: [RouterLink, ModelPickerComponent],
  templateUrl: './reports.page.html',
})
export class ReportsPage {
  private readonly api = inject(ReportApi);
  private readonly catalog = inject(CatalogApi);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly reports = toSignal(this.api.list(), { initialValue: [] as ReportInfo[] });
  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  private readonly catalogModels = toSignal(this.catalog.models(), { initialValue: [] });

  readonly kind = computed(() => this.params().get('kind') ?? 'free-stock');
  readonly report = computed(() => this.reports().find((r) => r.kind === this.kind()) ?? null);
  readonly values = computed<ReportParams>(() => {
    const out: ReportParams = {};
    for (const p of this.report()?.params ?? []) out[p.name] = this.params().get(p.name) ?? '';
    return out;
  });
  readonly selectedModels = computed(() => (this.values()['models'] ?? '').split(',').filter(Boolean));
  readonly missing = computed(() => (this.report()?.params ?? []).some((p) => p.required && !this.values()[p.name]));

  readonly freeModels = signal<ModelCount[]>([]);
  readonly allModels = computed<ModelCount[]>(() => [
    ...this.catalogModels().map((m) => ({ id: m.id, name: m.name, count: 0 })),
    { id: 'custom' as const, name: 'Вне справочника', count: 0 },
  ]);
  readonly freeTotal = computed(() => this.freeModels().reduce((sum, m) => sum + m.count, 0));

  readonly result = signal<ReportResult | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly downloading = signal(false);

  readonly blocks = computed<Block[]>(() => {
    const blocks: Block[] = [];
    for (const row of this.result()?.rows ?? []) {
      const last = blocks[blocks.length - 1];
      if (last && last.group === row.group) last.rows.push(row);
      else blocks.push({ group: row.group, rows: [row] });
    }
    return blocks;
  });

  readonly hasRepeats = computed(() => (this.result()?.rows ?? []).some((r) => r.mark === 'warn'));

  private request = 0;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const report = this.report();
      const values = this.values();
      if (!report) return;
      untracked(() => this.load(report, values));
    });
    effect(() => {
      if (this.kind() === 'free-stock') untracked(() => this.loadFreeModels());
    });
  }

  private async loadFreeModels() {
    try {
      this.freeModels.set(await firstValueFrom(this.api.freeStockModels()));
    } catch {
      this.freeModels.set([]);
    }
  }

  private async load(report: ReportInfo, values: ReportParams) {
    const id = ++this.request;
    this.error.set(null);
    if (this.missing()) {
      this.result.set(null);
      return;
    }
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.api.run(report.kind, values));
      if (id === this.request) this.result.set(result);
    } catch (err) {
      if (id === this.request) {
        this.result.set(null);
        this.error.set(errorText(err, 'Не удалось построить отчёт.'));
      }
    } finally {
      if (id === this.request) this.loading.set(false);
    }
  }

  subtitle(text: string): string {
    return text.replace(/\.+$/, '');
  }

  markClass(mark: ReportRow['mark']): string {
    return mark === 'warn' ? 'bg-warn/10' : mark === 'crit' ? 'bg-crit/[.06]' : '';
  }

  select(kind: string) {
    const report = this.reports().find((r) => r.kind === kind);
    const queryParams: Record<string, string> = { kind };
    if (report?.params.some((p) => p.name === 'from')) {
      const today = factoryDay(new Date())!;
      queryParams['from'] = today.slice(0, 8) + '01';
      queryParams['to'] = today;
    }
    this.router.navigate([], { queryParams });
  }

  set(name: string, value: string) {
    this.router.navigate([], { queryParams: { [name]: value || null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  type(name: string, value: string) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.set(name, value.trim()), 350);
  }

  setModels(ids: string[]) {
    this.set('models', ids.join(','));
  }

  async download() {
    this.downloading.set(true);
    try {
      await this.api.download(this.kind(), this.values());
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось скачать файл.'));
    } finally {
      this.downloading.set(false);
    }
  }
}
