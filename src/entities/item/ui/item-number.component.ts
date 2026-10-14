import { Component, input } from '@angular/core';

@Component({
  selector: 'app-item-number',
  template: `
    <div class="num whitespace-nowrap font-bold" [class]="large() ? 'text-3xl' : 'text-[15px]'">{{ number() }}</div>
    @if (indiv()) {
      <div class="text-[10px] font-semibold uppercase tracking-wide text-lime">заказ</div>
    }
  `,
})
export class ItemNumberComponent {
  readonly number = input.required<string>();
  readonly indiv = input(false);
  readonly large = input(false);
}
