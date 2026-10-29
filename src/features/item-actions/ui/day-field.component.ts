import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { factoryDay } from '@shared/lib';

export function todayIso(): string {
  return factoryDay(new Date()) ?? '';
}

/** Дата этапа: поле и «Сегодня / Вчера» — кнопку часто жмут на следующий день. */
@Component({
  selector: 'app-day-field',
  imports: [FormsModule],
  template: `
    <div class="grid gap-3">
      <label class="grid content-start gap-1.5">
        <span class="text-xs text-muted">{{ label() }}</span>
        <input type="date" class="field" name="day" required [ngModel]="value()" (ngModelChange)="value.set($event)" [max]="today" />
      </label>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="chip" [class.chip-on]="value() === today" (click)="value.set(today)">Сегодня</button>
        <button type="button" class="chip" [class.chip-on]="value() === yesterday" (click)="value.set(yesterday)">Вчера</button>
      </div>
    </div>
  `,
})
export class DayFieldComponent {
  readonly label = input.required<string>();
  readonly value = model('');
  // окно могли оставить открытым через полночь — «сегодня» берём при создании поля, то есть при каждом открытии окна
  readonly today = todayIso();
  readonly yesterday = factoryDay(new Date(Date.now() - 86_400_000)) ?? '';
}
