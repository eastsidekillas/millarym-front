import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CatalogApi } from '@entities/catalog';
import { Counters, Item, ItemApi, ItemListParams, ItemsChanged, STAGES, Stage, StageFilter, TRASH_HINT } from '@entities/item';
import { ItemForm } from '@features/item-form';
import { errorText } from '@shared/api';
import { ToastService } from '@shared/ui';
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
  imports: [RouterLink, StageTabsComponent, ItemsTableComponent, ItemCardComponent, BulkBarComponent, TrashFabComponent],
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
  readonly stage = computed<StageFilter | null>(() => (this.q() ? null : this.tab()));
  readonly filter = computed<FilterId>(() => {
    const f = this.params().get('filter') ?? '';
    return FILTERS.some((x) => x.id === f) ? (f as FilterId) : '';
  });
  readonly model = computed(() => this.params().get('model') ?? '');
  readonly freeStockParams = computed(() => ({ kind: 'free-stock', models: this.model() || null }));
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
    if (stage === null) return `Поиск по всем этапам, найдено ${this.total()}.`;
    if (stage === 'trash') return TRASH_HINT;
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
      this.changed.version();
      untracked(() => this.load(params));
    });
    effect(() => {
      this.stage();
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
      stage: this.stage() ?? undefined,
      q: this.q() || undefined,
      model: this.model() || undefined,
      free: f === 'free',
      reserved: f === 'reserved',
      indiv: f === 'indiv',
      late: f === 'late',
    };
  });

  private async load(params: ItemListParams, append = false) {
    const id = ++this.request;
    this.loading.set(true);
    try {
      const offset = append ? this.items().length : 0;
      const [page, counters] = await Promise.all([
        firstValueFrom(this.api.list({ ...params, limit: PAGE, offset })),
        append ? Promise.resolve(this.counters()) : firstValueFrom(this.api.counters()),
      ]);
      if (id !== this.request) return;
      this.items.set(append ? [...this.items(), ...page.results] : page.results);
      this.total.set(page.count);
      this.counters.set(counters);
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

  more() {
    this.load(this.listParams(), true);
  }

  go(params: Record<string, string | number | null>) {
    this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge' });
  }

  selectStage(stage: Stage | 'trash') {
    this.go({ stage, q: null, item: null });
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
