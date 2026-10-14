import { Component, computed, inject, input, output } from '@angular/core';
import { Item, MOVE_RIGHT, NEXT_STAGE, STAGES, Stage, nextLabel } from '@entities/item';
import { SessionStore } from '@entities/session';
import { ItemActions } from '@features/item-actions';

@Component({
  selector: 'app-bulk-bar',
  template: `
    <div class="sticky top-[57px] z-20 mb-3 flex min-h-12 flex-wrap items-center gap-2 rounded-lg border border-accent bg-surface px-3 py-2">
      <span class="mr-2 text-sm font-medium">Выбрано: {{ items().length }}</span>
      @if (next(); as to) {
        <button type="button" class="btn-row-next" [disabled]="actions.busy()" (click)="move(to)">{{ nextText() }}</button>
      }
      @if (session.can('move_any')) {
        <select class="select-sm" aria-label="Переместить на этап" #target (change)="moveAny(target.value); target.value = ''">
          <option value="">Переместить на этап…</option>
          @for (s of targets; track s.id) {
            <option [value]="s.id">{{ s.name }}</option>
          }
        </select>
      }
      <button type="button" class="btn-ghost ml-auto" (click)="cleared.emit()">Снять выделение</button>
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
