import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6" (click)="closed.emit()">
      <div
        class="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-surface shadow-xl md:rounded-2xl"
        [class]="width()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 class="text-base font-semibold">{{ title() }}</h2>
            @if (subtitle()) {
              <div class="text-xs text-muted">{{ subtitle() }}</div>
            }
          </div>
          <button type="button" class="rounded-md px-2 py-1 text-muted hover:text-ink" aria-label="Закрыть" (click)="closed.emit()">✕</button>
        </div>
        <ng-content />
      </div>
    </div>
  `,
})
export class ModalComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly width = input('md:max-w-2xl');
  readonly closed = output<void>();
}
