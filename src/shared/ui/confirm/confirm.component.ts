import { Component, inject } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm',
  imports: [ModalComponent],
  template: `
    @if (confirm.current(); as c) {
      <app-modal [title]="c.title" width="md:max-w-md" (closed)="c.resolve(false)">
        <div class="grid gap-5 px-6 py-5">
          <p class="text-sm">{{ c.text }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-outline" (click)="c.resolve(false)">Отмена</button>
            <button type="button" [class]="c.danger ? 'btn bg-crit text-white hover:bg-crit/90' : 'btn-primary'" (click)="c.resolve(true)">
              {{ c.ok }}
            </button>
          </div>
        </div>
      </app-modal>
    }
  `,
})
export class ConfirmComponent {
  readonly confirm = inject(ConfirmService);
}
