import { Component, input, output } from '@angular/core';
import { LucideAngularModule, Trash2 } from 'lucide-angular';

@Component({
  selector: 'app-trash-fab',
  imports: [LucideAngularModule],
  template: `
    <button
      type="button"
      class="fixed bottom-5 right-5 z-30 flex h-10 items-center gap-2 rounded-lg border px-4 text-sm shadow-[0_1px_2px_rgb(0_0_0/.06)]"
      [class]="active() ? 'border-accent bg-accent font-medium text-onaccent' : 'border-line bg-surface hover:bg-sub'"
      (click)="pressed.emit()"
    >
      <lucide-icon [img]="trashIcon" />
      Корзина
      <span class="tnum" [class]="active() ? 'text-onaccent/75' : 'text-muted'">{{ count() ?? '' }}</span>
    </button>
  `,
})
export class TrashFabComponent {
  readonly count = input<number | null>(null);
  readonly active = input(false);
  readonly pressed = output<void>();
  readonly trashIcon = Trash2;
}
