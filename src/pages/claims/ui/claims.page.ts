import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ClaimApi, ClaimListItem, ClaimQuery, ClaimStats } from '@entities/claim';
import { SessionStore } from '@entities/session';
import { errorText } from '@shared/api';
import { fmtDate } from '@shared/lib';
import { PaginatorComponent, ToastService } from '@shared/ui';

const PAGE = 50;

@Component({
  selector: 'app-claims-page',
  imports: [RouterLink, PaginatorComponent],
  templateUrl: './claims.page.html',
})
export class ClaimsPage {
  private readonly api = inject(ClaimApi);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly canEdit = inject(SessionStore).can('claims');
  readonly fmt = fmtDate;

  private readonly params = toSignal(this.route.queryParamMap, { requireSync: true });
  readonly choices = toSignal(this.api.choices());
  readonly query = computed<ClaimQuery>(() => {
    const p = this.params();
    return {
      q: p.get('q') ?? '',
      claim_type: p.get('claim_type') ?? '',
      defect_type: p.get('defect_type') ?? '',
      state: p.get('state') ?? '',
      from: p.get('from') ?? '',
      to: p.get('to') ?? '',
    };
  });
  readonly filtered = computed(() => Object.values(this.query()).some(Boolean));

  readonly items = signal<ClaimListItem[]>([]);
  readonly total = signal(0);
  readonly stats = signal<ClaimStats | null>(null);
  readonly loading = signal(false);
  readonly stateCount = computed(() => {
    const rows = this.stats()?.state ?? [];
    const n = (id: string) => rows.find((r) => r.id === id)?.count ?? 0;
    return { all: rows.reduce((sum, r) => sum + r.count, 0), open: n('open'), closed: n('done') + n('withdrawn'), done: n('done'), withdrawn: n('withdrawn') };
  });
  readonly allDefects = computed(() => (this.stats()?.defect_type ?? []).reduce((sum, d) => sum + d.count, 0));
  private request = 0;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const q = this.query();
      const page = this.page();
      untracked(() => this.load(q, page));
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


  private async load(query: ClaimQuery, pageNumber: number) {
    const id = ++this.request;
    this.loading.set(true);
    try {
      const offset = (pageNumber - 1) * PAGE;
      const [page, stats] = await Promise.all([
        firstValueFrom(this.api.list({ ...query, limit: PAGE, offset })),
        firstValueFrom(this.api.stats(query)),
      ]);
      if (id !== this.request) return;
      this.items.set(page.results);
      this.total.set(page.count);
      this.stats.set(stats);
    } catch (err) {
      if (id === this.request) this.toast.error(errorText(err, 'Не удалось загрузить рекламации.'));
    } finally {
      if (id === this.request) this.loading.set(false);
    }
  }


  set(name: keyof ClaimQuery, value: string) {
    this.router.navigate([], { queryParams: { [name]: value || null, page: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  type(value: string) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.set('q', value.trim()), 300);
  }

  reset() {
    this.router.navigate([], { queryParams: {} });
  }

  open(item: ClaimListItem) {
    this.router.navigate(['/claims', item.id]);
  }

  async blank() {
    try {
      await this.api.downloadBlank();
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось подготовить бланк.'));
    }
  }
}
