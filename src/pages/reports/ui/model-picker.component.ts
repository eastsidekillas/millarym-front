import { Component, computed, input, model, signal } from '@angular/core';
import { ModelCount } from '@entities/report';

@Component({
  selector: 'app-model-picker',
  template: `
    <div class="grid gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <input type="search" class="field h-8 max-w-[220px] text-[13px]" placeholder="Найти модель" aria-label="Найти модель" (input)="search.set($any($event.target).value)" />
        @if (selected().length) {
          <button type="button" class="btn-ghost" (click)="selected.set([])">Снять все галочки ({{ selected().length }})</button>
        }
      </div>
      <ul class="grid max-h-72 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-4 overflow-y-auto rounded-lg border border-line bg-surface p-2">
        @for (m of filtered(); track m.id) {
          <li>
            <label class="flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-sub">
              <input type="checkbox" class="h-4 w-4 accent-[rgb(var(--accent))]" [checked]="isOn(m.id)" (change)="toggle(m.id)" />
              <span class="min-w-0 flex-1 truncate" [title]="m.name">{{ m.name }}</span>
              @if (showCounts()) {
                <span class="tnum text-xs text-muted">{{ m.count }}</span>
              }
            </label>
          </li>
        } @empty {
          <li class="px-2 py-2 text-sm text-muted">{{ options().length ? 'Ничего не нашли' : 'Моделей нет' }}</li>
        }
      </ul>
    </div>
  `,
})
export class ModelPickerComponent {
  readonly options = input.required<ModelCount[]>();
  readonly showCounts = input(true);
  readonly selected = model<string[]>([]);
  readonly search = signal('');

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase().replace('ё', 'е');
    return q ? this.options().filter((m) => m.name.toLowerCase().replace('ё', 'е').includes(q)) : this.options();
  });

  isOn(id: number | 'custom'): boolean {
    return this.selected().includes(String(id));
  }

  toggle(id: number | 'custom') {
    const key = String(id);
    this.selected.update((list) => (list.includes(key) ? list.filter((x) => x !== key) : [...list, key]));
  }
}
