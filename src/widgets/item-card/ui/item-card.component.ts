import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Lock, LucideAngularModule, X } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { FABRIC_SLOTS, NEXT_STAGE, ItemAction, ItemApi, ItemDetail, ItemNumberComponent, ItemsChanged, LOCK_TEXT, Mark, MOVE_LABEL, STAGES, STAGE_NAME, Stage, itemAlert, meters, purgeText } from '@entities/item';
import { ReportApi } from '@entities/report';
import { SessionStore } from '@entities/session';
import { ItemActions } from '@features/item-actions';
import { ItemForm } from '@features/item-form';
import { PrintPassport } from '@features/print-passport';
import { errorText } from '@shared/api';
import { PhotoViewer, ToastService } from '@shared/ui';
import { daysSince, daysUntil, factoryDay, fmtDate, fmtDateTime } from '@shared/lib';

@Component({
  selector: 'app-item-card',
  imports: [FormsModule, NgTemplateOutlet, RouterLink, ItemNumberComponent, LucideAngularModule],
  host: { '(document:keydown.escape)': 'closed.emit()' },
  templateUrl: './item-card.component.html',
})
export class ItemCardComponent {
  readonly itemId = input.required<number>();
  readonly closed = output<void>();
  readonly opened = output<number>();

  private readonly api = inject(ItemApi);
  private readonly changed = inject(ItemsChanged);
  readonly actions = inject(ItemActions);
  private readonly itemForm = inject(ItemForm);
  private readonly reports = inject(ReportApi);
  readonly passport = inject(PrintPassport);
  readonly canClaim = inject(SessionStore).can('claims');
  readonly canMarks = inject(SessionStore).can('marks');
  private readonly toast = inject(ToastService);

  readonly item = signal<ItemDetail | null>(null);
  readonly error = signal<string | null>(null);
  reserve = '';
  readonly exporting = signal(false);

  readonly icons = { close: X, lock: Lock };
  readonly viewer = inject(PhotoViewer);
  readonly fmt = fmtDate;
  readonly fmtTime = fmtDateTime;
  readonly daysSince = daysSince;
  readonly daysUntil = daysUntil;
  readonly purgeText = purgeText;
  readonly meters = meters;
  readonly path = STAGES;
  readonly stageName = STAGE_NAME;

  readonly byCode = computed(() => {
    const map = new Map<string, ItemAction>();
    for (const a of this.item()?.actions ?? []) map.set(a.code, a);
    return map;
  });
  readonly stageIndex = computed(() => {
    const it = this.item();
    return it ? STAGES.findIndex((s) => s.id === it.stage) : -1;
  });
  readonly alert = computed(() => {
    const it = this.item();
    return it ? itemAlert(it) : null;
  });
  readonly fabricRows = computed(() =>
    FABRIC_SLOTS.map(({ slot, label }) => ({ label, fabric: this.item()?.fabrics.find((f) => f.slot === slot) ?? null })),
  );
  readonly mainActions = computed(() =>
    (this.item()?.actions ?? []).filter(
      (a) => a.allowed && ['move', 'restore', 'fabric_arrived', 'sew', 'cover_ready', 'ship', 'return_to_work'].includes(a.code),
    ),
  );
  readonly otherActions = computed(() => {
    const actions = (this.item()?.actions ?? []).filter((a) => a.allowed && ['edit', 'copy', 'cancel', 'trash'].includes(a.code));
    // на «Заказах» вместо «Удалить» — «Снять заказ», две красные кнопки рядом путают
    return actions.some((a) => a.code === 'cancel') ? actions.filter((a) => a.code !== 'trash') : actions;
  });
  readonly locked = computed(() =>
    (this.item()?.actions ?? []).filter((a) => !a.allowed && (a.code === 'move' || a.code === 'restore')),
  );
  // следующий этап — зелёная кнопка, здесь только переход через этап или назад
  readonly moveTargets = computed(() => {
    const stage = this.item()?.stage;
    return STAGES.filter((s) => s.id !== 'orders' && s.id !== stage && (!stage || s.id !== NEXT_STAGE[stage]));
  });

  constructor() {
    effect(() => {
      const id = this.itemId();
      this.changed.version();
      untracked(() => this.load(id));
    });
  }

  private async load(id: number) {
    try {
      const item = await firstValueFrom(this.api.get(id));
      if (item.id !== this.itemId()) return;
      this.item.set(item);
      this.reserve = item.reserve;
      this.error.set(null);
    } catch (err) {
      this.error.set(errorText(err, 'Не удалось открыть изделие.'));
    }
  }

  moveLabel(a: ItemAction): string {
    return a.to ? MOVE_LABEL[a.to] : a.label;
  }

  plainLabel(a: ItemAction): string {
    return a.code === 'return_to_work' ? 'Вернуть в работу' : a.label;
  }

  lockText(a: ItemAction): string {
    const names = a.reason.split('Могут: ')[1]?.replace(/\.$/, '');
    if (!names) return a.reason;
    const what = a.code === 'move' && a.to ? `Перемещать ${MOVE_LABEL[a.to].toLowerCase()} могут` : LOCK_TEXT[a.code];
    return `${what ?? 'Могут'}: ${names}.`;
  }

  action(code: string): ItemAction | undefined {
    return this.byCode().get(code);
  }

  async run(a: ItemAction) {
    const item = this.item();
    if (!item || !a.allowed) return;
    if (a.code === 'move' && a.to) await this.actions.move(item, a.to);
    else if (a.code === 'edit') this.itemForm.edit(item);
    else {
      const result = await this.actions.run(item, a.code);
      if (result && a.code === 'copy') this.opened.emit(result.id);
    }
  }

  async moveTo(to: string) {
    const item = this.item();
    if (item && to) await this.actions.move(item, to as Stage);
  }

  async saveReserve() {
    const item = this.item();
    if (item && this.reserve.trim() !== item.reserve) await this.actions.reserve(item, this.reserve);
  }

  printPassport(it: ItemDetail) {
    this.passport.print([it.id]);
  }

  readonly acking = signal(false);
  // правки после последнего «Изменения учтены», без комментариев
  readonly recentEdits = computed(() => {
    const events = this.item()?.events ?? [];
    const ack = events.findIndex((e) => e.text === 'Изменения учтены');
    return (ack === -1 ? events : events.slice(0, ack)).filter(
      (e) => e.kind === 'edit' && !e.text.startsWith('Комментарий') && !e.text.startsWith('Перенесено из старой системы'),
    );
  });

  async ackChanges(it: ItemDetail) {
    this.acking.set(true);
    try {
      await firstValueFrom(this.api.run(it.id, 'ack-changes'));
      this.changed.notify();
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось отметить.'));
    } finally {
      this.acking.set(false);
    }
  }

  readonly unmarking = signal(false);
  readonly editingMark = signal<Mark | null>(null);
  markDate = '';
  readonly todayIso = factoryDay(new Date()) ?? '';

  createdIso(it: ItemDetail): string {
    return factoryDay(it.created_at) ?? '';
  }

  editMark(mark: Mark, value: string) {
    this.markDate = value;
    this.editingMark.set(mark);
  }

  async saveMarkDate(it: ItemDetail, mark: Mark) {
    this.unmarking.set(true);
    try {
      await firstValueFrom(this.api.markDate(it.id, mark, this.markDate));
      this.editingMark.set(null);
      this.changed.notify();
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось изменить дату.'));
    } finally {
      this.unmarking.set(false);
    }
  }

  canUnmark(it: ItemDetail, stage: Stage): boolean {
    return this.canMarks && !it.trashed_at && it.stage === stage;
  }

  async unmark(it: ItemDetail, mark: Mark) {
    this.unmarking.set(true);
    try {
      await firstValueFrom(this.api.unmark(it.id, mark));
      this.changed.notify();
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось снять отметку.'));
    } finally {
      this.unmarking.set(false);
    }
  }

  async exportXlsx(it: ItemDetail) {
    this.exporting.set(true);
    try {
      await this.reports.downloadItem(it.id, it.number);
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось скачать файл.'));
    } finally {
      this.exporting.set(false);
    }
  }
}
