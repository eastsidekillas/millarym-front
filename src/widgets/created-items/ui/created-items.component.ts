import { Component, computed, inject, signal } from '@angular/core';
import { Check, Copy, LucideAngularModule, Printer } from 'lucide-angular';
import { STAGE_NAME } from '@entities/item';
import { ItemForm } from '@features/item-form';
import { PrintPassport } from '@features/print-passport';
import { ModalComponent, ToastService } from '@shared/ui';

/** После «Создать»: номера новых изделий, чтобы их записать, и печать паспортов — окно не закрывается само. */
@Component({
  selector: 'app-created-items',
  imports: [LucideAngularModule, ModalComponent],
  template: `
    @if (form.done(); as items) {
      <app-modal [title]="heading()" [subtitle]="'Этап «' + stageName[items[0].stage] + '»'" width="md:max-w-lg" (closed)="close()">
        <div class="grid gap-4 px-6 py-5">
          <ul class="divide-y divide-line rounded-lg border border-line">
            @for (it of items; track it.id) {
              <li class="flex items-baseline gap-4 px-4 py-3">
                <span class="num w-24 flex-none text-lg">{{ it.number }}</span>
                <span class="min-w-0 text-sm">
                  {{ it.title }}
                  @if (it.reserve) {
                    <span class="block text-xs text-muted">{{ it.reserve }}</span>
                  }
                </span>
              </li>
            }
          </ul>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn-primary" [disabled]="passport.busy()" (click)="print()">
              <span class="flex"><lucide-icon [img]="printIcon" /></span>
              {{ items.length > 1 ? 'Распечатать паспорта' : 'Распечатать паспорт' }}
            </button>
            <button type="button" class="btn-outline" (click)="copy()">
              <span class="flex"><lucide-icon [img]="copied() ? checkIcon : copyIcon" /></span>
              {{ copied() ? 'Скопировано' : 'Скопировать номера' }}
            </button>
          </div>
        </div>
        <div class="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">
          <button type="button" class="btn-outline" (click)="more()">Ещё изделие</button>
          <button type="button" class="btn-outline" (click)="close()">Готово</button>
        </div>
      </app-modal>
    }
  `,
})
export class CreatedItemsComponent {
  readonly form = inject(ItemForm);
  readonly passport = inject(PrintPassport);
  private readonly toast = inject(ToastService);

  readonly stageName = STAGE_NAME;
  readonly copied = signal(false);
  readonly printIcon = Printer;
  readonly copyIcon = Copy;
  readonly checkIcon = Check;

  readonly heading = computed(() => {
    const n = this.form.done()?.length ?? 0;
    return n > 1 ? `Создано изделий: ${n}` : 'Изделие создано';
  });

  print() {
    this.passport.print((this.form.done() ?? []).map((i) => i.id));
  }

  async copy() {
    const text = (this.form.done() ?? []).map((i) => `${i.number} ${i.title}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // http без HTTPS (сеть завода) — буфер обмена браузер не даёт
      this.toast.error('Не удалось скопировать — выделите номера мышкой.');
    }
  }

  more() {
    this.copied.set(false);
    this.form.done.set(null);
    this.form.create();
  }

  close() {
    this.copied.set(false);
    this.form.finish();
  }
}
