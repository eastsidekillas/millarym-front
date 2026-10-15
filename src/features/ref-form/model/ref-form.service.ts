import { Injectable, signal } from '@angular/core';
import { SimpleRef, SimpleRefKind } from '@entities/catalog';

export interface RefFormState {
  kind: SimpleRefKind;
  item: SimpleRef | null;
}

export const REF_TEXT: Record<SimpleRefKind, { one: string; create: string; placeholder: string }> = {
  categories: { one: 'Категория', create: 'Новая категория', placeholder: 'Например, Кровати' },
  'kit-options': { one: 'Кнопка комплектации', create: 'Новая кнопка комплектации', placeholder: 'Например, Накладки венге' },
  teams: { one: 'Бригада', create: 'Новая бригада', placeholder: 'Например, Бригада Иванова' },
};

@Injectable({ providedIn: 'root' })
export class RefForm {
  readonly state = signal<RefFormState | null>(null);
  readonly saved = signal(0);

  open(kind: SimpleRefKind, item: SimpleRef | null = null): void {
    this.state.set({ kind, item });
  }

  close(): void {
    this.state.set(null);
  }
}
