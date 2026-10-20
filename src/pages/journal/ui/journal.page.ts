import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EmployeeApi } from '@entities/employee';
import { ItemApi, ItemEvent } from '@entities/item';
import { errorText } from '@shared/api';
import { factoryDay, fmtDayLong, fmtTime } from '@shared/lib';
import { PaginatorComponent, ToastService } from '@shared/ui';

const PAGE = 100;

const KINDS = [
  { id: '', title: 'Все действия' },
  { id: 'created', title: 'Заведено' },
  { id: 'move', title: 'Перемещение' },
  { id: 'fabric', title: 'Ткань пришла' },
  { id: 'sew', title: 'Выдано в шитьё' },
  { id: 'cover_ready', title: 'Отшит' },
  { id: 'reserve', title: 'Резерв' },
  { id: 'edit', title: 'Правка' },
  { id: 'copy', title: 'Копия' },
  { id: 'ship', title: 'Отгрузка' },
  { id: 'trash', title: 'Удаление' },
  { id: 'restore', title: 'Восстановление' },
  { id: 'return', title: 'Возврат в работу' },
];

interface DayGroup {
  day: string;
  title: string;
  events: ItemEvent[];
}

@Component({
  selector: 'app-journal-page',
  imports: [RouterLink, PaginatorComponent],
  templateUrl: './journal.page.html',
})
export class JournalPage {
  private readonly api = inject(ItemApi);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly employees = toSignal(inject(EmployeeApi).list(), { initialValue: [] });
  readonly kinds = KINDS;

  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  readonly user = computed(() => this.params().get('user') ?? '');
  readonly kind = computed(() => this.params().get('kind') ?? '');
  readonly from = computed(() => this.params().get('from') ?? '');
  readonly to = computed(() => this.params().get('to') ?? '');
  readonly q = computed(() => this.params().get('q') ?? '');

  readonly events = signal<ItemEvent[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);

  readonly groups = computed<DayGroup[]>(() => {
    const today = factoryDay(new Date());
    const yesterday = factoryDay(new Date(Date.now() - 864e5));
    const groups: DayGroup[] = [];
    for (const e of this.events()) {
      const day = factoryDay(e.at)!;
      let group = groups[groups.length - 1];
      if (!group || group.day !== day) {
        const title = day === today ? 'Сегодня' : day === yesterday ? 'Вчера' : fmtDayLong(day);
        group = { day, title, events: [] };
        groups.push(group);
      }
      group.events.push(e);
    }
    return groups;
  });

  private timer?: ReturnType<typeof setTimeout>;
  private request = 0;

  constructor() {
    effect(() => {
      const query = this.query();
      const page = this.page();
      untracked(() => this.load(query, page));
    });
  }

  readonly page = computed(() => {
    const n = Number(this.params().get('page'));
    return Number.isInteger(n) && n > 1 ? n : 1;
  });
  readonly pageSize = PAGE;

  setPage(page: number) {
    this.router.navigate([], { queryParams: { page: page > 1 ? page : null }, queryParamsHandling: 'merge' });
    window.scrollTo({ top: 0 });
  }


  private query = computed(() => {
    const q: Record<string, string> = {};
    if (this.user()) q['user'] = this.user();
    if (this.kind()) q['kind'] = this.kind();
    if (this.from()) q['from'] = this.from();
    if (this.to()) q['to'] = this.to();
    if (this.q()) q['q'] = this.q();
    return q;
  });

  hasFilters = computed(() => Object.keys(this.query()).length > 0);

  readonly timeOf = fmtTime;

  set(key: string, value: string) {
    this.router.navigate([], { queryParams: { [key]: value || null, page: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  type(value: string) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.set('q', value.trim()), 300);
  }

  reset() {
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  async load(query: Record<string, string>, page: number) {
    const id = ++this.request;
    this.loading.set(true);
    try {
      const result = await firstValueFrom(
        this.api.events({ ...query, limit: PAGE, offset: (page - 1) * PAGE }),
      );
      if (id !== this.request) return;
      this.events.set(result.results);
      this.total.set(result.count);
    } catch (err) {
      if (id === this.request) this.toast.error(errorText(err, 'Не удалось загрузить журнал.'));
    } finally {
      if (id === this.request) this.loading.set(false);
    }
  }

}
