import { Component, input, output } from '@angular/core';
import { Counters, STAGES, Stage } from '@entities/item';

@Component({
  selector: 'app-stage-tabs',
  template: `
    <div class="flex min-w-0 overflow-x-auto" role="tablist" aria-label="Этапы">
      <div class="flex flex-none rounded-lg border border-line bg-surface p-0.5">
        @for (s of stages; track s.id) {
          @let on = active() === s.id;
          @let c = counters()?.stages?.[s.id];
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="on"
            class="flex h-8 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm"
            [class]="on ? 'bg-accent font-medium text-onaccent' : 'text-ink hover:bg-sub'"
            (click)="selected.emit(s.id)"
          >
            {{ s.name }}
            <span class="tnum text-[13px]" [class]="on ? 'text-onaccent/75' : 'text-muted'">{{ c?.total ?? '' }}</span>
            @if (c?.late) {
              <span
                class="tnum inline-flex h-[18px] min-w-[18px] items-center justify-center rounded px-1 text-[11px] font-medium"
                [class]="on ? 'bg-onaccent text-crit' : 'bg-crit text-white'"
                [title]="'Просрочено: ' + c!.late"
              >
                {{ c!.late }}
              </span>
            }
          </button>
        }
      </div>
    </div>
  `,
})
export class StageTabsComponent {
  readonly counters = input<Counters | null>(null);
  readonly active = input<Stage | null>(null);
  readonly selected = output<Stage>();
  readonly stages = STAGES;
}
