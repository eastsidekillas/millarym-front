import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { factoryDay } from '@shared/lib';
import { ModalComponent } from '@shared/ui';
import { ItemActions } from '../model/item-actions.service';

@Component({
  selector: 'app-date-dialog',
  imports: [FormsModule, ModalComponent],
  template: `
    @if (actions.dateRequest(); as req) {
      <app-modal
        [title]="req.count > 1 ? 'На СГП ' + req.count + ' изд.' : 'На СГП'"
        subtitle="Когда изделие переведено на склад готовой продукции"
        width="md:max-w-md"
        (closed)="req.resolve(null)"
      >
        <form class="grid gap-5 px-6 py-5" (ngSubmit)="date && req.resolve(date)">
          <label class="grid content-start gap-1.5">
            <span class="text-xs text-muted">Дата перевода на СГП</span>
            <input type="date" class="field" name="date" required [(ngModel)]="date" [max]="today" />
          </label>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="chip" [class.chip-on]="date === today" (click)="date = today">Сегодня</button>
            <button type="button" class="chip" [class.chip-on]="date === yesterday" (click)="date = yesterday">Вчера</button>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-outline" (click)="req.resolve(null)">Отмена</button>
            <button type="submit" class="btn-primary" [disabled]="!date || date > today">На СГП</button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class DateDialogComponent {
  readonly actions = inject(ItemActions);
  today = '';
  yesterday = '';
  date = '';

  constructor() {
    effect(() => {
      if (!this.actions.dateRequest()) return;
      // окно могли оставить открытым через полночь — «сегодня» считаем при каждом открытии
      const now = new Date();
      this.today = factoryDay(now) ?? '';
      this.yesterday = factoryDay(new Date(now.getTime() - 86_400_000)) ?? '';
      this.date = this.today;
    });
  }
}
