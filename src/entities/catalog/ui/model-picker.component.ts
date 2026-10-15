import { Component, ElementRef, computed, inject, input, model, signal } from '@angular/core';
import { ProductModel } from '../model/catalog.types';

export type ModelChoice = number | 'custom' | null;

const norm = (text: string) => text.toLowerCase().replaceAll('ё', 'е');

@Component({
  selector: 'app-model-picker',
  host: { class: 'relative block', '(document:click)': 'outside($event)' },
  template: `
    <input
      class="field"
      role="combobox"
      aria-autocomplete="list"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="label()"
      [placeholder]="value() === 'custom' ? 'Нет в справочнике — впишите название ниже' : 'Начните вводить название модели'"
      [value]="open() ? text() : selectedName()"
      (input)="type($any($event.target).value)"
      (focus)="show()"
      (click)="show()"
      (keydown)="key($event)"
      autocomplete="off"
    />
    @if (open()) {
      <ul class="absolute left-0 right-0 top-10 z-10 max-h-72 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-[0_4px_12px_rgb(0_0_0/.08)]" role="listbox">
        @for (m of results(); track m.id; let i = $index) {
          <li role="option" [attr.aria-selected]="m.id === value()">
            <button
              type="button"
              tabindex="-1"
              class="flex min-h-9 w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm"
              [class.bg-sub]="i === cursor()"
              [class.font-medium]="m.id === value()"
              (mouseenter)="cursor.set(i)"
              (click)="pick(m.id)"
            >
              <span>{{ m.name }}</span>
              <span class="flex-none text-xs text-muted">{{ m.category_name }}</span>
            </button>
          </li>
        } @empty {
          <li class="px-3 py-2 text-sm text-muted">Не нашли «{{ text() }}» в справочнике</li>
        }
        <li role="option" class="border-t border-line" [attr.aria-selected]="value() === 'custom'">
          <button
            type="button"
            tabindex="-1"
            class="flex h-9 w-full items-center px-3 text-left text-sm text-accent"
            [class.bg-sub]="cursor() === results().length"
            (mouseenter)="cursor.set(results().length)"
            (click)="pick('custom')"
          >
            Нет в справочнике, вписать вручную
          </button>
        </li>
      </ul>
    }
  `,
})
export class ModelPickerComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly models = input.required<ProductModel[]>();
  readonly value = model<ModelChoice>(null);
  readonly label = input('Модель');

  readonly text = signal('');
  readonly open = signal(false);
  readonly cursor = signal(0);

  readonly selectedName = computed(() => {
    const v = this.value();
    if (v === null || v === 'custom') return '';
    return this.models().find((m) => m.id === v)?.name ?? '';
  });

  readonly results = computed(() => {
    const words = norm(this.text()).split(/\s+/).filter(Boolean);
    if (!words.length) return this.models();
    return this.models().filter((m) => {
      const name = norm(m.name);
      return words.every((w) => name.includes(w));
    });
  });

  show() {
    if (this.open()) return;
    this.text.set('');
    this.cursor.set(0);
    this.open.set(true);
  }

  type(text: string) {
    this.text.set(text);
    this.cursor.set(0);
    this.open.set(true);
  }

  key(event: KeyboardEvent) {
    const last = this.results().length;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.open()) this.show();
      else this.cursor.update((c) => Math.min(c + 1, last));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.cursor.update((c) => Math.max(c - 1, 0));
    } else if (event.key === 'Enter' && this.open()) {
      event.preventDefault();
      const c = this.cursor();
      this.pick(c < last ? this.results()[c].id : 'custom');
    } else if (event.key === 'Escape' && this.open()) {
      event.stopPropagation();
      this.open.set(false);
    } else if (event.key === 'Tab') {
      this.open.set(false);
    }
  }

  pick(choice: ModelChoice) {
    this.value.set(choice);
    this.open.set(false);
  }

  outside(event: Event) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }
}
