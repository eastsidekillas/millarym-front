import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-trash-fab',
  template: `
    <button
      type="button"
      class="fixed bottom-5 right-5 z-30 flex h-10 items-center gap-2 rounded-lg border px-4 text-sm shadow-[0_1px_2px_rgb(0_0_0/.06)]"
      [class]="active() ? 'border-accent bg-accent font-medium text-onaccent' : 'border-line bg-surface hover:bg-sub'"
      (click)="pressed.emit()"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
      </svg>
      Корзина
      <span class="tnum" [class]="active() ? 'text-onaccent/75' : 'text-muted'">{{ count() ?? '' }}</span>
    </button>
  `,
})
export class TrashFabComponent {
  readonly count = input<number | null>(null);
  readonly active = input(false);
  readonly pressed = output<void>();
}
