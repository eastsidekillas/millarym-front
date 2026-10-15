import { Injectable, signal } from '@angular/core';
import { ProductModel } from '@entities/catalog';

export type ModelFormState = { mode: 'create'; category?: number } | { mode: 'edit'; model: ProductModel };

@Injectable({ providedIn: 'root' })
export class ModelForm {
  readonly state = signal<ModelFormState | null>(null);
  readonly saved = signal(0);

  create(category?: number): void {
    this.state.set({ mode: 'create', category });
  }

  edit(model: ProductModel): void {
    this.state.set({ mode: 'edit', model });
  }

  close(): void {
    this.state.set(null);
  }
}
