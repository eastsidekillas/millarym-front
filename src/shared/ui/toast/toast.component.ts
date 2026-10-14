import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  template: `
    @if (toast.current(); as t) {
      <div
        role="status"
        class="fixed bottom-5 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm"
        [class]="t.kind === 'error' ? 'bg-crit text-white' : 'bg-ink text-bg'"
        (click)="toast.current.set(null)"
      >
        {{ t.text }}
      </div>
    }
  `,
})
export class ToastComponent {
  readonly toast = inject(ToastService);
}
