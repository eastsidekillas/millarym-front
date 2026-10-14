import { Component, input } from '@angular/core';

@Component({
  selector: 'app-item-number',
  template: `
    <div class="num whitespace-nowrap leading-tight" [class]="large() ? 'text-[28px]' : 'text-[15px]'">{{ number() }}</div>
    @if (indiv()) {
      <div class="text-xs font-medium text-lime-ink">заказ</div>
    }
  `,
})
export class ItemNumberComponent {
  readonly number = input.required<string>();
  readonly indiv = input(false);
  readonly large = input(false);
}
