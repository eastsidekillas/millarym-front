import { Component, computed, inject, input, output } from '@angular/core';
import { FabricListComponent, Item, ItemNumberComponent, MOVE_RIGHT, NEXT_STAGE, STAGE_NAME, StageFilter, itemAlert, nextLabel, purgeText } from '@entities/item';
import { SessionStore } from '@entities/session';
import { ItemActions } from '@features/item-actions';
import { daysSince, daysUntil, fmtDate } from '@shared/lib';

type Column = 'fabric' | 'sew' | 'cover_ready' | 'work' | 'marks';

const STAGE_COLUMNS: Partial<Record<StageFilter, { key: Column; title: string }[]>> = {
  orders: [{ key: 'fabric', title: 'Ткань пришла' }],
  cut: [
    { key: 'sew', title: 'Выдано в шитьё' },
    { key: 'cover_ready', title: 'Отшит' },
  ],
  work: [{ key: 'work', title: 'Выдано в работу' }],
};

@Component({
  selector: 'app-items-table',
  imports: [FabricListComponent, ItemNumberComponent],
  templateUrl: './items-table.component.html',
})
export class ItemsTableComponent {
  readonly items = input.required<Item[]>();
  readonly stage = input<StageFilter | null>(null);
  readonly selected = input<ReadonlySet<number>>(new Set());
  readonly loading = input(false);
  readonly opened = output<number>();
  readonly toggled = output<Item>();
  readonly toggledAll = output<boolean>();

  readonly session = inject(SessionStore);
  readonly actions = inject(ItemActions);

  readonly fmt = fmtDate;
  readonly daysSince = daysSince;
  readonly daysUntil = daysUntil;
  readonly purgeText = purgeText;
  readonly stageName = STAGE_NAME;
  readonly alert = itemAlert;
  readonly nextLabel = nextLabel;

  readonly searching = computed(() => this.stage() === null);
  readonly trash = computed(() => this.stage() === 'trash');
  // в поиске по всем этапам — одна колонка: у каждого изделия отметки его этапа (ткань, шитьё, работа)
  readonly columns = computed(() =>
    this.searching() ? [{ key: 'marks' as Column, title: 'Отметки' }] : (STAGE_COLUMNS[this.stage() ?? 'fg'] ?? []),
  );
  readonly allSelected = computed(() => this.items().length > 0 && this.items().every((i) => this.selected().has(i.id)));

  canNext(item: Item): boolean {
    const to = NEXT_STAGE[item.stage];
    return !!to && !item.trashed_at && this.session.can(MOVE_RIGHT[to]);
  }

  next(item: Item) {
    const to = NEXT_STAGE[item.stage];
    if (to) this.actions.move(item, to);
  }
}
