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

@Component({
  selector: 'app-fabric-picker',
  host: { class: 'relative block', '(document:click)': 'outside($event)' },
  template: `
    <input
      class="field"
      [placeholder]="placeholder()"
      [value]="value()?.name ?? text()"
      (input)="type($any($event.target).value)"
      (focus)="open.set(true); search(text())"
      (keydown.escape)="open.set(false)"
      [attr.aria-label]="label()"
      autocomplete="off"
    />
    @if (open() && (results().length || text())) {
      <ul class="absolute left-0 right-0 top-10 z-10 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-[0_4px_12px_rgb(0_0_0/.08)]">
        @for (f of results(); track f.id) {
          <li>
            <button type="button" class="flex h-9 w-full items-center gap-2 px-3 text-left text-sm hover:bg-sub" (click)="pick(f)">
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
  readonly results = signal<Fabric[]>([]);
  private readonly query$ = new Subject<string>();

  constructor() {
    this.query$
      .pipe(debounceTime(200), distinctUntilChanged(), switchMap((q) => this.api.fabrics(q)), takeUntilDestroyed())
      .subscribe((list) => this.results.set(list));
  }

  type(text: string) {
    this.text.set(text);
    if (this.value()) this.value.set(null);
    this.open.set(true);
    this.search(text);
  }

  search(text: string) {
    this.query$.next(text.trim());
  }

  pick(f: Fabric) {
    this.value.set({ id: f.id, name: f.name, photo_thumb: f.photo_thumb });
    this.text.set('');
    this.open.set(false);
  }

  outside(event: Event) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }
}
