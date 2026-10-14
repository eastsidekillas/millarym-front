import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-trash-fab',
  template: `
    <button
      type="button"
      class="fixed bottom-5 right-5 z-30 flex h-12 items-center gap-2 rounded-full border pl-4 pr-5 text-sm shadow-lg"
      [class]="active() ? 'border-accent bg-accent font-semibold text-onaccent' : 'border-line bg-surface hover:bg-sub'"
      aria-label="Корзина"
      (click)="pressed.emit()"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
      </svg>
      Корзина <span class="tnum opacity-80">{{ count() ?? '' }}</span>
    </button>
  `,
})
export class TrashFabComponent {
  readonly count = input<number | null>(null);
  readonly active = input(false);
  readonly pressed = output<void>();
}
