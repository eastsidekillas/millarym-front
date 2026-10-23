import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CatalogApi } from '@entities/catalog';
import { Counters, Item, ItemApi, ItemListParams, ItemsChanged, STAGES, Stage, StageFilter, TRASH_HINT } from '@entities/item';
import { ItemForm } from '@features/item-form';
import { errorText } from '@shared/api';
import { PaginatorComponent, ToastService } from '@shared/ui';
import { BulkBarComponent } from '@widgets/bulk-bar';
import { ItemCardComponent } from '@widgets/item-card';
import { ItemsTableComponent } from '@widgets/items-table';
import { StageTabsComponent } from '@widgets/stage-tabs';
import { TrashFabComponent } from '@widgets/trash-fab';

const PAGE = 50;
const STAGE_IDS: StageFilter[] = [...STAGES.map((s) => s.id), 'trash'];
const FILTERS = [
  { id: '', title: 'Все' },
  { id: 'free', title: 'Свободные' },
  { id: 'reserved', title: 'В резерве' },
  { id: 'indiv', title: 'Индивидуальные' },
  { id: 'late', title: 'Просрочены' },
] as const;
type FilterId = (typeof FILTERS)[number]['id'];

@Component({
  selector: 'app-production-page',
  imports: [RouterLink, PaginatorComponent, StageTabsComponent, ItemsTableComponent, ItemCardComponent, BulkBarComponent, TrashFabComponent],
  templateUrl: './production.page.html',
})
export class ProductionPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ItemApi);
  private readonly changed = inject(ItemsChanged);
  private readonly toast = inject(ToastService);
  private readonly itemForm = inject(ItemForm);
  private readonly catalog = inject(CatalogApi);

  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  readonly models = toSignal(this.catalog.models(), { initialValue: [] });
  readonly filters = FILTERS;

  readonly q = computed(() => (this.params().get('q') ?? '').trim());
  readonly tab = computed<StageFilter>(() => {
    const s = this.params().get('stage') as StageFilter;
    return STAGE_IDS.includes(s) ? s : 'orders';
  });
  readonly stage = computed<StageFilter | null>(() => (this.q() && this.tab() !== 'trash' ? null : this.tab()));
  /** Поиск по всем этапам можно сузить до одного: ?in=cut. */
  readonly searchIn = computed<StageFilter | null>(() => {
    const s = this.params().get('in') as StageFilter;
    return this.stage() === null && STAGE_IDS.includes(s) ? s : null;
  });
  readonly searchStages = signal<Record<StageFilter, number> | null>(null);
  readonly searchChips = computed(() => {
    const counts = this.searchStages();
    if (!counts) return [];
    const all = [...STAGES.map((s) => ({ id: s.id as StageFilter, name: s.name })), { id: 'trash' as StageFilter, name: 'Корзина' }];
    return all.map((s) => ({ ...s, count: counts[s.id] ?? 0 })).filter((s) => s.count || s.id === this.searchIn());
  });
  readonly searchTotal = computed(() => Object.values(this.searchStages() ?? {}).reduce((a, b) => a + b, 0));
  readonly filter = computed<FilterId>(() => {
    const f = this.params().get('filter') ?? '';
    return FILTERS.some((x) => x.id === f) ? (f as FilterId) : '';
  });
  readonly model = computed(() => this.params().get('model') ?? '');
  readonly freeStockParams = computed(() => ({ kind: 'free-stock', models: this.model() || null }));
  readonly page = computed(() => {
    const n = Number(this.params().get('page'));
    return Number.isInteger(n) && n > 1 ? n : 1;
  });
  readonly pageSize = PAGE;
  readonly openId = computed(() => {
    const id = Number(this.params().get('item'));
    return Number.isInteger(id) && id > 0 ? id : null;
  });

  readonly items = signal<Item[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly counters = signal<Counters | null>(null);
  readonly selection = signal<Map<number, Item>>(new Map());
  readonly selectedIds = computed(() => new Set(this.selection().keys()));
  readonly selectedItems = computed(() => [...this.selection().values()]);

  readonly hint = computed(() => {
    const stage = this.stage();
    if (stage === null) {
      const where = this.searchIn();
      const name = where === 'trash' ? 'Корзина' : STAGES.find((s) => s.id === where)?.name;
      return where ? `Поиск на этапе «${name}», найдено ${this.total()}.` : `Поиск по всем этапам, найдено ${this.total()}.`;
    }
    if (stage === 'trash') return this.q() ? `Поиск в Корзине, найдено ${this.total()}.` : TRASH_HINT;
    return STAGES.find((s) => s.id === stage)?.hint ?? '';
  });
  readonly late = computed(() => {
    const stage = this.stage();
    return stage && stage !== 'trash' ? (this.counters()?.stages[stage]?.late ?? 0) : 0;
  });

  private request = 0;

  constructor() {
    effect(() => {
      const params = this.listParams();
      const page = this.page();
      this.changed.version();
      untracked(() => this.load(params, page));
    });
    effect(() => {
      this.stage();
      this.searchIn();
      this.filter();
      this.model();
      untracked(() => this.selection.set(new Map()));
    });
    effect(() => {
      const created = this.itemForm.created();
      if (!created?.length) return;
      untracked(() => {
        this.itemForm.created.set(null);
        this.go({ stage: created[0].stage, q: null, filter: null, item: created.length === 1 ? created[0].id : null });
      });
    });
  }

  private listParams = computed<ItemListParams>(() => {
    const f = this.filter();
    return {
      stage: this.stage() ?? this.searchIn() ?? undefined,
      q: this.q() || undefined,
      model: this.model() || undefined,
      free: f === 'free',
      reserved: f === 'reserved',
      indiv: f === 'indiv',
      late: f === 'late',
    };
  });

  private async load(params: ItemListParams, pageNumber: number) {
    const id = ++this.request;
    this.loading.set(true);
    try {
      const searching = this.stage() === null;
      const [page, counters, stages] = await Promise.all([
        firstValueFrom(this.api.list({ ...params, limit: PAGE, offset: (pageNumber - 1) * PAGE })),
        firstValueFrom(this.api.counters()),
        searching ? firstValueFrom(this.api.searchStages(params)) : Promise.resolve(null),
      ]);
      if (id !== this.request) return;
      if (!page.results.length && pageNumber > 1) {
        // после перемещения или удаления страница могла опустеть
        this.go({ page: Math.max(1, Math.ceil(page.count / PAGE)) });
        return;
      }
      this.items.set(page.results);
      this.total.set(page.count);
      this.counters.set(counters);
      this.searchStages.set(stages);
      this.refreshSelection(page.results);
    } catch (err) {
      if (id === this.request) this.toast.error(errorText(err, 'Не удалось загрузить список.'));
    } finally {
      if (id === this.request) this.loading.set(false);
    }
  }

  private refreshSelection(fresh: Item[]) {
    const current = this.selection();
    if (!current.size) return;
    const next = new Map<number, Item>();
    const byId = new Map(fresh.map((i) => [i.id, i]));
    for (const [id, item] of current) {
      const updated = byId.get(id);
      if (updated && updated.stage === item.stage && !updated.trashed_at) next.set(id, updated);
    }
    this.selection.set(next);
  }

  setPage(page: number) {
    this.go({ page: page > 1 ? page : null });
    window.scrollTo({ top: 0 });
  }

  go(params: Record<string, string | number | null>) {
    // новый этап, поиск или фильтр — снова с первой страницы
    const reset = !('page' in params) && ['stage', 'q', 'in', 'filter', 'model'].some((k) => k in params);
    this.router.navigate([], { queryParams: reset ? { ...params, page: null } : params, queryParamsHandling: 'merge' });
  }

  private searchTimer?: ReturnType<typeof setTimeout>;

  searchTrash(text: string) {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.go({ q: text.trim() || null, item: null }), 300);
  }

  selectStage(stage: Stage | 'trash') {
    this.go({ stage, q: null, in: null, item: null });
  }

  searchOn(stage: StageFilter | null) {
    this.go({ in: stage });
  }

  setFilter(id: string) {
    this.go({ filter: id || null });
  }

  setModel(id: string) {
    this.go({ model: id || null });
  }

  open(id: number) {
    this.go({ item: id });
  }

  close() {
    this.go({ item: null });
  }

  toggle(item: Item) {
    const next = new Map(this.selection());
    if (next.has(item.id)) next.delete(item.id);
    else next.set(item.id, item);
    this.selection.set(next);
  }

  toggleAll(on: boolean) {
    this.selection.set(on ? new Map(this.items().filter((i) => !i.trashed_at).map((i) => [i.id, i])) : new Map());
  }

  clearSelection() {
    this.selection.set(new Map());
  }
}
