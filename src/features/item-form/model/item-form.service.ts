import { Injectable, signal } from '@angular/core';
import { Item, ItemDetail } from '@entities/item';

export type ItemFormState = { mode: 'create' } | { mode: 'edit'; item: ItemDetail };

@Injectable({ providedIn: 'root' })
export class ItemForm {
  readonly state = signal<ItemFormState | null>(null);
  /** Что получилось после «Создать»: окно с номерами и печатью паспортов, пока сотрудник его не закроет. */
  readonly done = signal<Item[] | null>(null);
  /** Окно с номерами закрыто — список переходит на этап новых изделий. */
  readonly created = signal<Item[] | null>(null);

  finish(): void {
    this.created.set(this.done());
    this.done.set(null);
  }

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
