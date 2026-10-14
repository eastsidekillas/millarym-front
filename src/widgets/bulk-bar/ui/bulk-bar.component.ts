import { Component, computed, inject, input, output } from '@angular/core';
import { Item, MOVE_RIGHT, NEXT_STAGE, STAGES, Stage, nextLabel } from '@entities/item';
import { SessionStore } from '@entities/session';
import { ItemActions } from '@features/item-actions';

@Component({
  selector: 'app-bulk-bar',
  template: `
    <div class="sticky top-[76px] z-20 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-accent bg-surface px-4 py-2 shadow-sm">
      <span class="text-sm font-semibold">Выбрано: {{ items().length }}</span>
      @if (next(); as to) {
        <button type="button" class="h-8 rounded-full bg-accent px-3 text-xs font-medium text-onaccent disabled:opacity-50" [disabled]="actions.busy()" (click)="move(to)">
          {{ nextText() }}
        </button>
      }
      @if (session.can('move_any')) {
        <select class="h-8 rounded-full border border-line bg-surface px-2 text-xs" aria-label="Переместить в…" #target (change)="moveAny(target.value); target.value = ''">
          <option value="">Переместить в…</option>
          @for (s of targets; track s.id) {
            <option [value]="s.id">{{ s.name }}</option>
          }
        </select>
      }
      <button type="button" class="h-8 px-3 text-xs text-muted hover:text-ink" (click)="cleared.emit()">Снять выделение</button>
    </div>
  `,
})
export class BulkBarComponent {
  readonly items = input.required<Item[]>();
  readonly cleared = output<void>();
  readonly done = output<void>();

  readonly session = inject(SessionStore);
  readonly actions = inject(ItemActions);
  readonly targets = STAGES.filter((s) => s.id !== 'orders');

  private readonly sameStage = computed(() => {
    const stages = new Set(this.items().map((i) => i.stage));
    return stages.size === 1 ? [...stages][0] : null;
  });

  readonly next = computed(() => {
    const stage = this.sameStage();
    const to = stage ? NEXT_STAGE[stage] : undefined;
    return to && this.session.can(MOVE_RIGHT[to]) ? to : null;
  });

  readonly nextText = computed(() => {
    const stage = this.sameStage();
    return stage ? nextLabel(stage) : '';
  });

  async move(to: Stage) {
    if (await this.actions.bulkMove(this.items(), to)) this.done.emit();
  }

  async moveAny(to: string) {
    if (to) await this.move(to as Stage);
  }
}
