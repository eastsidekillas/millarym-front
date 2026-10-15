import { Component, input, output } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';

@Component({
  selector: 'app-modal',
  imports: [LucideAngularModule],
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 md:items-center md:p-6" (click)="closed.emit()">
      <div
        class="max-h-[92vh] w-full overflow-y-auto rounded-t-xl border border-line bg-surface md:rounded-xl"
        [class]="width()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 class="text-base font-semibold leading-6">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="text-sm text-muted">{{ subtitle() }}</p>
            }
          </div>
          <button type="button" class="-mr-2 flex h-8 w-8 flex-none items-center justify-center rounded-md text-muted hover:bg-sub hover:text-ink" aria-label="Закрыть" (click)="closed.emit()">
            <lucide-icon [img]="closeIcon" />
          </button>
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
  readonly closeIcon = X;
}
