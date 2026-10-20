import { Component, computed, input, output } from '@angular/core';
import { ChevronLeft, ChevronRight, LucideAngularModule } from 'lucide-angular';

type Slot = number | 'gap';

/** Номера страниц: 1 … 4 5 6 … 18. Счёт страниц с 1. */
@Component({
  selector: 'app-paginator',
  imports: [LucideAngularModule],
  template: `
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted">
      @if (total()) {
        <span class="tnum">{{ from() }}–{{ to() }} из {{ total() }}</span>
      }
      @if (pages() > 1) {
        <nav class="flex items-center gap-1" aria-label="Страницы">
          <button type="button" class="btn-ghost h-8 w-8 p-0" [disabled]="page() <= 1 || disabled()" aria-label="Предыдущая страница" (click)="go(page() - 1)">
            <span class="flex"><lucide-icon [img]="prev" [size]="16" /></span>
          </button>
          @for (s of slots(); track $index) {
            @if (s === 'gap') {
              <span class="w-6 text-center">…</span>
            } @else {
              <button
                type="button"
                class="tnum h-8 min-w-8 rounded-md px-2"
                [class]="s === page() ? 'bg-accent/[.1] font-medium text-accent' : 'text-ink hover:bg-sub'"
                [attr.aria-current]="s === page() ? 'page' : null"
                [disabled]="disabled()"
                (click)="go(s)"
              >
                {{ s }}
              </button>
            }
          }
          <button type="button" class="btn-ghost h-8 w-8 p-0" [disabled]="page() >= pages() || disabled()" aria-label="Следующая страница" (click)="go(page() + 1)">
            <span class="flex"><lucide-icon [img]="next" [size]="16" /></span>
          </button>
        </nav>
      }
    </div>
  `,
})
export class PaginatorComponent {
  readonly page = input.required<number>();
  readonly total = input.required<number>();
  readonly pageSize = input(50);
  readonly disabled = input(false);
  readonly pageChange = output<number>();

  readonly prev = ChevronLeft;
  readonly next = ChevronRight;

  readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly from = computed(() => (this.page() - 1) * this.pageSize() + 1);
  readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));
  readonly slots = computed<Slot[]>(() => {
    const last = this.pages();
    const current = this.page();
    const wanted = new Set([1, last, current - 1, current, current + 1].filter((n) => n >= 1 && n <= last));
    if (current <= 3) [2, 3, 4].forEach((n) => n <= last && wanted.add(n));
    if (current >= last - 2) [last - 1, last - 2, last - 3].forEach((n) => n >= 1 && wanted.add(n));
    const sorted = [...wanted].sort((a, b) => a - b);
    const out: Slot[] = [];
    sorted.forEach((n, i) => {
      if (i && n - sorted[i - 1] > 1) out.push(n - sorted[i - 1] === 2 ? n - 1 : 'gap');
      out.push(n);
    });
    return out;
  });

  go(page: number) {
    if (page >= 1 && page <= this.pages() && page !== this.page()) this.pageChange.emit(page);
  }
}
