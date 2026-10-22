import { Component, input, output } from '@angular/core';
import { LucideAngularModule, Trash2 } from 'lucide-angular';

@Component({
  selector: 'app-trash-fab',
  imports: [LucideAngularModule],
  template: `
    <button
      type="button"
      class="btn border"
      [class]="active() ? 'border-accent bg-accent text-onaccent' : 'border-line bg-surface text-ink hover:bg-sub'"
      [attr.aria-pressed]="active()"
      (click)="pressed.emit()"
    >
      <span class="flex" [class]="active() ? 'text-onaccent' : 'text-muted'"><lucide-icon [img]="trashIcon" /></span>
      Корзина
      <span class="tnum font-normal" [class]="active() ? 'text-onaccent/75' : 'text-muted'">{{ count() ?? '' }}</span>
    </button>
  `,
})
export class TrashFabComponent {
  readonly count = input<number | null>(null);
  readonly active = input(false);
  readonly pressed = output<void>();
  readonly trashIcon = Trash2;
}
