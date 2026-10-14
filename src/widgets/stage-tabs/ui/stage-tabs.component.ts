import { Component, input, output } from '@angular/core';
import { Counters, STAGES, Stage } from '@entities/item';

@Component({
  selector: 'app-stage-tabs',
  template: `
    <div class="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Этапы">
      @for (s of stages; track s.id) {
        @let on = active() === s.id;
        @let c = counters()?.stages?.[s.id];
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="on"
          class="relative h-11 flex-none whitespace-nowrap rounded-xl border px-4 text-sm"
          [class]="on ? 'border-accent bg-accent font-semibold text-onaccent' : 'border-line bg-surface hover:bg-sub'"
          (click)="selected.emit(s.id)"
        >
          {{ s.name }}
          <span class="tnum" [class]="on ? 'opacity-80' : 'text-muted'">{{ c?.total ?? '…' }}</span>
          @if (c?.late) {
            <span class="tnum absolute -right-1.5 -top-1.5 h-[18px] min-w-[18px] rounded-full bg-crit px-1 text-center text-[11px] leading-[18px] text-white" [title]="'Просрочено: ' + c!.late">
              {{ c!.late }}
            </span>
          }
        </button>
      }
    </div>
  `,
})
export class StageTabsComponent {
  readonly counters = input<Counters | null>(null);
  readonly active = input<Stage | null>(null);
  readonly selected = output<Stage>();
  readonly stages = STAGES;
}
