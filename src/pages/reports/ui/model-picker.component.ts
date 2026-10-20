import { Component, ElementRef, HostListener, computed, inject, input, model, signal } from '@angular/core';
import { ChevronDown, LucideAngularModule, X } from 'lucide-angular';
import { ModelCount } from '@entities/report';

/** Выбор моделей: кнопка с выпадающим списком и поиском, выбранные — чипсами рядом. */
@Component({
  selector: 'app-model-picker',
  imports: [LucideAngularModule],
  template: `
    <div class="flex flex-wrap items-center gap-1.5">
      <div class="relative">
        <button type="button" class="field flex h-9 w-auto min-w-[220px] items-center justify-between gap-3 text-left" [attr.aria-expanded]="open()" (click)="toggleOpen()">
          <span class="truncate">{{ label() }}</span>
          <span class="flex text-muted"><lucide-icon [img]="chevron" [size]="16" /></span>
        </button>
        @if (open()) {
          <div class="absolute left-0 top-full z-30 mt-1 w-[min(420px,calc(100vw-2rem))] rounded-lg border border-line bg-surface shadow-lg">
            <div class="flex items-center gap-2 border-b border-line p-2">
              <input #searchBox type="search" class="field h-8 text-[13px]" placeholder="Найти модель" aria-label="Найти модель" [value]="search()" (input)="search.set($any($event.target).value)" />
            </div>
            <ul class="max-h-72 overflow-y-auto p-1">
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
            <div class="flex flex-wrap items-center gap-2 border-t border-line p-2">
              @if (search().trim() && unpickedFound().length) {
                <button type="button" class="btn-ghost h-8 px-2 text-[13px]" (click)="pickFound()">Отметить найденные ({{ unpickedFound().length }})</button>
              }
              @if (selected().length) {
                <button type="button" class="btn-ghost h-8 px-2 text-[13px]" (click)="selected.set([])">Снять все</button>
              }
              <button type="button" class="btn-outline ml-auto h-8" (click)="open.set(false)">Готово</button>
            </div>
          </div>
        }
      </div>
      @for (m of picked(); track m.id) {
        <span class="chip h-7 gap-1 pr-1">
          {{ m.name }}
          <button type="button" class="flex text-muted hover:text-crit" [attr.aria-label]="'Убрать ' + m.name" (click)="toggle(m.id)">
            <lucide-icon [img]="remove" [size]="14" />
          </button>
        </span>
      }
    </div>
  `,
})
export class ModelPickerComponent {
  private readonly host = inject(ElementRef);
  readonly options = input.required<ModelCount[]>();
  readonly showCounts = input(true);
  readonly total = input<number | null>(null);
  readonly selected = model<string[]>([]);
  readonly search = signal('');
  readonly open = signal(false);

  readonly chevron = ChevronDown;
  readonly remove = X;

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase().replaceAll('ё', 'е');
    return q ? this.options().filter((m) => m.name.toLowerCase().replaceAll('ё', 'е').includes(q)) : this.options();
  });
  readonly unpickedFound = computed(() => this.filtered().filter((m) => !this.isOn(m.id)));
  readonly picked = computed(() => this.options().filter((m) => this.isOn(m.id)));
  readonly label = computed(() => {
    const n = this.selected().length;
    if (!n) return this.total() === null ? 'Все модели' : `Все модели (${this.total()} шт.)`;
    const count = this.picked().reduce((sum, m) => sum + m.count, 0);
    return this.showCounts() ? `Выбрано моделей: ${n} (${count} шт.)` : `Выбрано моделей: ${n}`;
  });

  toggleOpen() {
    this.open.update((v) => !v);
    if (this.open()) setTimeout(() => this.host.nativeElement.querySelector('input[type=search]')?.focus());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(event.target)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.open.set(false);
  }

  pickFound() {
    this.selected.update((list) => [...list, ...this.unpickedFound().map((m) => String(m.id))]);
  }

  isOn(id: number | 'custom'): boolean {
    return this.selected().includes(String(id));
  }

  toggle(id: number | 'custom') {
    const key = String(id);
    this.selected.update((list) => (list.includes(key) ? list.filter((x) => x !== key) : [...list, key]));
  }
}
