import { Injectable, signal } from '@angular/core';
import { Item, ItemDetail } from '@entities/item';

export type ItemFormState = { mode: 'create' } | { mode: 'edit'; item: ItemDetail };

@Injectable({ providedIn: 'root' })
export class ItemForm {
  readonly state = signal<ItemFormState | null>(null);
  readonly created = signal<Item[] | null>(null);

  create(): void {
    this.state.set({ mode: 'create' });
  }

  edit(item: ItemDetail): void {
    this.state.set({ mode: 'edit', item });
  }

  close(): void {
    this.state.set(null);
  }
}
