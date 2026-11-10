import { Component, ElementRef, inject, input, model, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogApi } from '../api/catalog.api';
import { Fabric } from '../model/catalog.types';

export interface PickedFabric {
  id: number;
  name: string;
  photo_thumb: string | null;
}

const norm = (text: string) => text.trim().toLowerCase().replaceAll('ё', 'е');

/**
 * Ткань из справочника. Список открывается по клику, вводу или стрелке вниз (не при переходе Tab-ом,
 * чтобы не закрывать поля ниже) и закрывается кликом мимо, уходом фокуса, Tab, Esc.
 * Клики ловим на pointerdown: окно (app-modal) гасит click, и document:click внутри него не срабатывает.
 */
@Component({
  selector: 'app-fabric-picker',
  host: { class: 'relative block', '(document:pointerdown)': 'outside($event)', '(focusout)': 'blurred($event)' },
  template: `
    <input
      class="field"
      role="combobox"
      aria-autocomplete="list"
      [attr.aria-expanded]="open()"
      [class.border-crit]="pending()"
      [placeholder]="placeholder()"
      [value]="value()?.name ?? text()"
      (input)="type($any($event.target).value)"
      (click)="show()"
      (keydown)="key($event)"
      [attr.aria-label]="label()"
      autocomplete="off"
    />
    @if (open() && (results().length || text())) {
      <ul class="absolute left-0 right-0 top-10 z-20 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-[0_4px_12px_rgb(0_0_0/.08)]" role="listbox">
        @for (f of results(); track f.id; let i = $index) {
          <li role="option" [attr.aria-selected]="f.id === value()?.id">
            <button
              type="button"
              tabindex="-1"
              class="flex h-9 w-full items-center gap-2 px-3 text-left text-sm"
              [class.bg-sub]="i === cursor()"
              (mouseenter)="cursor.set(i)"
              (click)="pick(f)"
            >
              @if (f.photo_thumb) {
                <img [src]="f.photo_thumb" alt="" class="h-6 w-6 rounded object-cover" />
              } @else {
                <span class="h-6 w-6 rounded bg-sub"></span>
              }
              {{ f.name }}
            </button>
          </li>
        } @empty {
          <li class="px-3 py-2 text-sm text-muted">Не нашли «{{ text() }}» в справочнике тканей</li>
        }
      </ul>
    }
    @if (pending()) {
      <p class="mt-1 text-xs text-crit">Не выбрана — выберите из списка или сотрите</p>
    }
  `,
})
export class FabricPickerComponent {
  private readonly api = inject(CatalogApi);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly value = model<PickedFabric | null>(null);
  readonly placeholder = input('');
  readonly label = input('Ткань');

  readonly text = signal('');
  readonly open = signal(false);
  readonly cursor = signal(0);
  /** Вписали текст, но ткань из списка не выбрали — иначе она молча не сохранится. */
  readonly pending = signal(false);
  readonly results = signal<Fabric[]>([]);
  private readonly query$ = new Subject<string>();

  constructor() {
    this.query$
      .pipe(debounceTime(200), distinctUntilChanged(), switchMap((q) => this.api.fabrics(q)), takeUntilDestroyed())
      .subscribe((list) => {
        this.results.set(list);
        this.cursor.set(0);
      });
  }

  show() {
    if (this.open()) return;
    this.open.set(true);
    this.search(this.text());
  }

  type(text: string) {
    this.text.set(text);
    this.pending.set(false);
    if (this.value()) this.value.set(null);
    this.open.set(true);
    this.search(text);
  }

  search(text: string) {
    this.query$.next(text.trim());
  }

  key(event: KeyboardEvent) {
    const list = this.results();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.open()) this.show();
      else this.cursor.update((c) => Math.min(c + 1, list.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.cursor.update((c) => Math.max(c - 1, 0));
    } else if (event.key === 'Enter') {
      // Enter в поле ткани не отправляет форму
      event.preventDefault();
      if (this.open() && list[this.cursor()]) this.pick(list[this.cursor()]);
    } else if (event.key === 'Escape' && this.open()) {
      // закрываем только список, не всё окно
      event.stopPropagation();
      this.close();
    } else if (event.key === 'Tab') {
      this.close();
    }
  }

  pick(f: Fabric) {
    this.value.set({ id: f.id, name: f.name, photo_thumb: f.photo_thumb });
    this.text.set('');
    this.pending.set(false);
    this.open.set(false);
  }

  /** Закрыть список; ткань, вписанную точно как в справочнике, выбираем сами. */
  close() {
    if (!this.open()) return;
    this.open.set(false);
    const text = norm(this.text());
    if (!text || this.value()) return;
    const exact = this.results().find((f) => norm(f.name) === text);
    if (exact) this.pick(exact);
    else this.pending.set(true);
  }

  outside(event: Event) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  blurred(event: FocusEvent) {
    const next = event.relatedTarget as Node | null;
    // без relatedTarget (клик по пустому месту, в Safari — и по пункту списка) решает pointerdown
    if (next && !this.host.nativeElement.contains(next)) this.close();
  }
}
