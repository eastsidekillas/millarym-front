import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '@shared/ui';
import { ItemActions } from '../model/item-actions.service';
import { DayFieldComponent, todayIso } from './day-field.component';

const TEXT = {
  cover: { title: 'На склад чехлов', subtitle: 'Когда отшитые чехлы сдали на склад', label: 'Дата перевода на склад чехлов' },
  fg: { title: 'На СГП', subtitle: 'Когда изделие переведено на склад готовой продукции', label: 'Дата перевода на СГП' },
};

@Component({
  selector: 'app-date-dialog',
  imports: [FormsModule, ModalComponent, DayFieldComponent],
  template: `
    @if (actions.dateRequest(); as req) {
      <app-modal
        [title]="text().title + (req.count > 1 ? ' ' + req.count + ' изд.' : '')"
        [subtitle]="text().subtitle"
        width="md:max-w-md"
        (closed)="req.resolve(null)"
      >
        <form class="grid gap-5 px-6 py-5" (ngSubmit)="valid() && req.resolve(date())">
          <app-day-field [label]="text().label" [(value)]="date" />
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-outline" (click)="req.resolve(null)">Отмена</button>
            <button type="submit" class="btn-primary" [disabled]="!valid()">{{ text().title }}</button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class DateDialogComponent {
  readonly actions = inject(ItemActions);
  readonly date = signal('');
  readonly text = computed(() => TEXT[this.actions.dateRequest()?.to ?? 'fg']);
  readonly valid = computed(() => !!this.date() && this.date() <= todayIso());

  constructor() {
    effect(() => {
      if (this.actions.dateRequest()) this.date.set(todayIso());
    });
  }
}
